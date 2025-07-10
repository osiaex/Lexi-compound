import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { OpenAI } from 'openai';
import { IAgent, Message, UserAnnotation } from 'src/types';
import { ConversationsModel } from '../models/ConversationsModel';
import { MetadataConversationsModel } from '../models/MetadataConversationsModel';
import { experimentsService } from './experiments.service';
import { usersService } from './users.service';
import { sadTalkerService } from './sadtalker.service';
import { ttsService } from './tts.service';
import edgeTtsService from './edgeTts.service';

dotenv.config();

const { API_PROVIDER, OPENAI_API_KEY, DEEPSEEK_API_KEY } = process.env;

let aiClient: OpenAI;
let apiProviderName: string;

// 根据API_PROVIDER环境变量初始化相应的客户端
if (API_PROVIDER === 'DeepSeek') {
    if (!DEEPSEEK_API_KEY) throw new Error('Server is not configured with DeepSeek API key');
    aiClient = new OpenAI({ 
        apiKey: DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com'
    });
    apiProviderName = 'DeepSeek';
} else {
    // 默认使用OpenAI
    if (!OPENAI_API_KEY) throw new Error('Server is not configured with OpenAI API key');
    aiClient = new OpenAI({ 
        apiKey: OPENAI_API_KEY
    });
    apiProviderName = 'OpenAI';
}

console.log(`🤖 AI Service initialized with ${apiProviderName} API`);

class ConversationsService {
    message = async (message, conversationId: string, streamResponse?, experimentFeatures?) => {
        const [conversation, metadataConversation] = await Promise.all([
            this.getConversation(conversationId, true),
            this.getConversationMetadata(conversationId),
        ]);

        if (
            metadataConversation.maxMessages &&
            metadataConversation.messagesNumber + 1 > metadataConversation.maxMessages
        ) {
            const error = new Error('Message limit exceeded');
            error['code'] = 403;
            throw error;
        }

        const messages: any[] = this.getConversationMessages(metadataConversation.agent, conversation, message);
        const chatRequest = this.getChatRequest(metadataConversation.agent, messages);
        await this.createMessageDoc(message, conversationId, conversation.length + 1);

        let assistantMessage = '';
        let talkingVideoBase64 = '';

        if (!streamResponse) {
            const response = await aiClient.chat.completions.create(chatRequest);
            assistantMessage = response.choices[0].message.content?.trim();
            
            // 如果启用了SadTalker，生成说话视频
            if (experimentFeatures?.sadTalker?.enabled && assistantMessage) {
                try {
                    console.log('Generating talking video for message...');
                    talkingVideoBase64 = await this.generateTalkingVideo(assistantMessage, conversationId, experimentFeatures);
                } catch (error) {
                    console.error('Failed to generate talking video:', error);
                    // 即使视频生成失败，也要返回文本消息
                }
            }
        } else {
            const responseStream = await aiClient.chat.completions.create({ ...chatRequest, stream: true });
            for await (const partialResponse of responseStream) {
                const assistantMessagePart = partialResponse.choices[0]?.delta?.content || '';
                await streamResponse(assistantMessagePart);
                assistantMessage += assistantMessagePart;
            }
            
            // 流式完成后生成视频
            if (experimentFeatures?.sadTalker?.enabled && assistantMessage) {
                try {
                    console.log('Generating talking video for streamed message...');
                    talkingVideoBase64 = await this.generateTalkingVideo(assistantMessage, conversationId, experimentFeatures);
                } catch (error) {
                    console.error('Failed to generate talking video:', error);
                }
            }
        }

        const savedMessage = await this.createMessageDoc(
            {
                content: assistantMessage,
                role: 'assistant',
                talkingVideo: talkingVideoBase64 || undefined,
            },
            conversationId,
            conversation.length + 2,
        );

        this.updateConversationMetadata(conversationId, {
            $inc: { messagesNumber: 1 },
            $set: { lastMessageDate: new Date(), lastMessageTimestamp: Date.now() },
        });

        return savedMessage;
    };

    createConversation = async (userId: string, userConversationsNumber: number, experimentId: string) => {
        let agent;
        const [user, experimentBoundries] = await Promise.all([
            usersService.getUserById(userId),
            experimentsService.getExperimentBoundries(experimentId),
        ]);

        if (
            !user.isAdmin &&
            experimentBoundries.maxConversations &&
            userConversationsNumber + 1 > experimentBoundries.maxConversations
        ) {
            const error = new Error('Conversations limit exceeded');
            error['code'] = 403;
            throw error;
        }

        if (user.isAdmin) {
            agent = await experimentsService.getActiveAgent(experimentId);
        }

        const res = await MetadataConversationsModel.create({
            conversationNumber: userConversationsNumber + 1,
            experimentId,
            userId,
            agent: user.isAdmin ? agent : user.agent,
            maxMessages: user.isAdmin ? undefined : experimentBoundries.maxMessages,
        });

        const firstMessage: Message = {
            role: 'assistant',
            content: user.isAdmin ? agent.firstChatSentence : user.agent.firstChatSentence,
        };
        await Promise.all([
            this.createMessageDoc(firstMessage, res._id.toString(), 1),
            usersService.addConversation(userId),
            !user.isAdmin && experimentsService.addSession(experimentId),
        ]);

        return res._id.toString();
    };

    getConversation = async (conversationId: string, isLean = false): Promise<Message[]> => {
        const returnValues = isLean
            ? { _id: 0, role: 1, content: 1, talkingVideo: 1 }
            : { _id: 1, role: 1, content: 1, userAnnotation: 1, talkingVideo: 1 };

        const conversation = await ConversationsModel.find({ conversationId }, returnValues);

        return conversation;
    };

    updateConversationSurveysData = async (conversationId: string, data, isPreConversation: boolean) => {
        const saveField = isPreConversation ? { preConversation: data } : { postConversation: data };
        const res = await this.updateConversationMetadata(conversationId, saveField);

        return res;
    };

    getConversationMetadata = async (conversationId: string): Promise<any> => {
        const res = await MetadataConversationsModel.findOne({ _id: new mongoose.Types.ObjectId(conversationId) });
        return res;
    };

    getUserConversations = async (userId: string): Promise<any> => {
        const conversations = [];
        const metadataConversations = await MetadataConversationsModel.find({ userId }, { agent: 0 }).lean();

        for (const metadataConversation of metadataConversations) {
            const conversation = await ConversationsModel.find({
                conversationId: metadataConversation._id,
            }).lean();
            conversations.push({
                metadata: metadataConversation,
                conversation,
            });
        }

        return conversations;
    };

    finishConversation = async (conversationId: string, experimentId: string, isAdmin: boolean): Promise<void> => {
        const res = await MetadataConversationsModel.updateOne(
            { _id: new mongoose.Types.ObjectId(conversationId) },
            { $set: { isFinished: true } },
        );

        if (res.modifiedCount && !isAdmin) {
            await experimentsService.closeSession(experimentId);
        }
    };

    deleteExperimentConversations = async (experimentId: string): Promise<void> => {
        const conversationIds = await this.getExperimentConversationsIds(experimentId);
        await Promise.all([
            MetadataConversationsModel.deleteMany({ _id: { $in: conversationIds.ids } }),
            ConversationsModel.deleteMany({ conversationId: { $in: conversationIds.strIds } }),
        ]);
    };

    updateUserAnnotation = async (messageId: string, userAnnotation: UserAnnotation): Promise<Message> => {
        const message: Message = await ConversationsModel.findOneAndUpdate(
            { _id: messageId },
            { $set: { userAnnotation } },
            { new: true },
        );

        return message;
    };

    private updateConversationMetadata = async (conversationId, fields) => {
        try {
            const res = await MetadataConversationsModel.updateOne(
                { _id: new mongoose.Types.ObjectId(conversationId) },
                fields,
            );
            return res;
        } catch (error) {
            console.error(`updateConversationMetadata - ${error}`);
        }
    };

    private getConversationMessages = (agent: IAgent, conversation: Message[], message: Message) => {
        const systemPrompt = { role: 'system', content: agent.systemStarterPrompt };
        const beforeUserMessage = { role: 'system', content: agent.beforeUserSentencePrompt };
        const afterUserMessage = { role: 'system', content: agent.afterUserSentencePrompt };

        const messages = [
            systemPrompt,
            ...conversation,
            beforeUserMessage,
            message,
            afterUserMessage,
            { role: 'assistant', content: '' },
        ];

        return messages;
    };

    private createMessageDoc = async (
        message: Message,
        conversationId: string,
        messageNumber: number,
    ): Promise<Message> => {
        const res = await ConversationsModel.create({
            content: message.content,
            role: message.role,
            conversationId,
            messageNumber,
            talkingVideo: message.talkingVideo,
        });

        return { 
            _id: res._id, 
            role: res.role, 
            content: res.content, 
            userAnnotation: res.userAnnotation,
            talkingVideo: res.talkingVideo 
        };
    };

    // 生成说话视频
    private generateTalkingVideo = async (text: string, conversationId: string, experimentFeatures?: any): Promise<string> => {
        console.log('Starting video generation for conversation:', conversationId);
        
        try {
            if (!await sadTalkerService.checkServiceHealth()) {
                console.error('SadTalker service health check failed');
                throw new Error('SadTalker service not available');
            }
            
            // 只使用默认头像（管理员设置的头像）
            console.log('Fetching default avatar...');
            const defaultAvatarData = await sadTalkerService.getDefaultAvatar();
            console.log('Default avatar data:', defaultAvatarData ? 'found' : 'not found');
            
            const avatarImage = defaultAvatarData ? defaultAvatarData.avatarBase64 : '';
            
            if (!avatarImage) {
                console.error('No default avatar available for video generation');
                throw new Error('No default avatar available - please contact administrator to set up default avatar');
            }
            
            console.log('Avatar image length:', avatarImage.length);
            
            // 根据配置选择 TTS 服务
            let audioBase64: string;
            const ttsServiceType = experimentFeatures?.sadTalker?.ttsService || 'edgetts';
            console.log('Using TTS service:', ttsServiceType);
            
            if (ttsServiceType === 'edgetts') {
                // 使用 EdgeTTS
                const edgeTtsVoice = experimentFeatures?.sadTalker?.edgeTtsVoice || 'zh-CN-XiaoxiaoNeural';
                console.log(`Using EdgeTTS with voice: ${edgeTtsVoice}`);
                
                const audioBuffer = await edgeTtsService.generateSpeech(text, {
                    voice: edgeTtsVoice,
                    rate: '+0%',
                    pitch: '+0Hz',
                    volume: '+0%'
                });
                audioBase64 = audioBuffer.toString('base64');
            } else {
                // 使用 OpenAI TTS
                if (!ttsService.isAvailable()) {
                    // 如果 OpenAI 不可用，回退到 EdgeTTS
                    console.log('OpenAI TTS not available, falling back to EdgeTTS');
                    const audioBuffer = await edgeTtsService.generateSpeech(text, {
                        voice: 'zh-CN-XiaoxiaoNeural'
                    });
                    audioBase64 = audioBuffer.toString('base64');
                } else {
                    console.log('Using OpenAI TTS');
                    audioBase64 = await ttsService.textToSpeech(text);
                }
            }
            
            console.log('Audio generation completed, length:', audioBase64.length);
            
            // 生成说话视频
            console.log('Starting SadTalker video generation...');
            const videoBase64 = await sadTalkerService.generateTalkingVideo(
                avatarImage,
                audioBase64,
                {
                    enhancer: false, // 禁用gfpgan enhancer以避免依赖问题
                    preprocess: 'crop',
                    still: false,
                    size: 256
                }
            );
            
            console.log('Video generation completed successfully, length:', videoBase64.length);
            return videoBase64;
            
        } catch (error) {
            console.error('Failed to generate talking video:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                conversationId,
                textLength: text.length
            });
            
            // 不再抛出错误，而是返回空字符串，让消息仍然能够显示
            // 这样用户仍然能看到文本消息，只是没有视频
            return '';
        }
    };
    
    // 移除用户头像获取方法 - 统一使用默认头像
    // private getUserAvatar 方法已删除

    private getChatRequest = (agent: IAgent, messages: Message[]) => {
        const chatCompletionsReq = {
            messages,
            model: agent.model,
        };

        if (agent.maxTokens) chatCompletionsReq['max_tokens'] = agent.maxTokens;
        if (agent.frequencyPenalty) chatCompletionsReq['frequency_penalty'] = agent.frequencyPenalty;
        if (agent.topP) chatCompletionsReq['top_p'] = agent.topP;
        if (agent.temperature) chatCompletionsReq['temperature'] = agent.temperature;
        if (agent.presencePenalty) chatCompletionsReq['presence_penalty'] = agent.presencePenalty;
        if (agent.stopSequences) chatCompletionsReq['stop'] = agent.stopSequences;

        return chatCompletionsReq;
    };

    private getExperimentConversationsIds = async (
        experimentId: string,
    ): Promise<{ ids: mongoose.Types.ObjectId[]; strIds: string[] }> => {
        const conversationsIds = await MetadataConversationsModel.aggregate([
            { $match: { experimentId } },
            { $project: { _id: 1, id: { $toString: '$_id' } } },
            { $group: { _id: null, ids: { $push: '$_id' }, strIds: { $push: '$id' } } },
            { $project: { _id: 0, ids: 1, strIds: 1 } },
        ]);
        return conversationsIds[0];
    };
}

export const conversationsService = new ConversationsService();
