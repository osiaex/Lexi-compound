import { SnackbarStatus, useSnackbar } from '@contexts/SnackbarProvider';
import { MessageType } from '@models/AppModels';
import SendIcon from '@mui/icons-material/Send';
import { Box, Button, IconButton } from '@mui/material';
import { useState, useEffect } from 'react';
import { sendMessage, sendStreamMessage } from '../../../../DAL/server-requests/conversations';
import { StyledInputBase, StyledInputBox } from './InputBox.s';
import VoiceInputButton from '../../../../components/voice-input/VoiceInputButton';
import { getWhisperConfig, WhisperConfig } from '../../../../DAL/server-requests/whisper';
import { useExperimentId } from '../../../../hooks/useExperimentId';

interface InputBoxProps {
    isMobile: boolean;
    messages: MessageType[];
    setMessages: (messages: MessageType[] | ((prevMessages: MessageType[]) => MessageType[])) => void;
    conversationId: string;
    setIsMessageLoading: (isLoading: boolean) => void;
    fontSize: string;
    isStreamMessage: boolean;
}

const InputBox: React.FC<InputBoxProps> = ({
    isMobile,
    messages,
    fontSize,
    conversationId,
    setMessages,
    setIsMessageLoading,
    isStreamMessage,
}) => {
    const { openSnackbar } = useSnackbar();
    const experimentId = useExperimentId();
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [whisperConfig, setWhisperConfig] = useState<WhisperConfig | null>(null);

    // 获取 Whisper 配置
    useEffect(() => {
        const fetchWhisperConfig = async () => {
            try {
                const config = await getWhisperConfig(experimentId);
                setWhisperConfig(config);
            } catch (error) {
                console.error('Failed to fetch Whisper config:', error);
                // 只有在网络错误时才显示错误，配置不存在是正常情况
                if (error.response?.status !== 404) {
                    openSnackbar('无法获取语音配置，语音功能可能不可用', SnackbarStatus.WARNING);
                }
                setWhisperConfig(null);
            }
        };

        if (experimentId) {
            fetchWhisperConfig();
        }
    }, [experimentId, openSnackbar]);

    const handleSendMessage = async () => {
        if (!message && !errorMessage && !message.trim().length) {
            openSnackbar('Message cannot be empty', SnackbarStatus.WARNING);
            return;
        }
        const messageContent: string = message || errorMessage;
        const conversation: MessageType[] = [...messages, { content: messageContent, role: 'user' }];
        setMessages(conversation);
        setMessage('');
        setIsMessageLoading(true);
        try {
            if (isStreamMessage) {
                sendStreamMessage(
                    { content: messageContent, role: 'user' },
                    conversationId,
                    onStreamMessage,
                    onCloseStream,
                    (error) => onMessageError(conversation, messageContent, error),
                );
            } else {
                const response = await sendMessage({ content: messageContent, role: 'user' }, conversationId);
                setMessages((prevMessages) => [...prevMessages, response]);
                setIsMessageLoading(false);
                setErrorMessage(null);
            }
        } catch (err) {
            onMessageError(conversation, messageContent, err);
        }
    };

    const onMessageError = (conversation, messageContent, error) => {
        setIsMessageLoading(false);
        setMessages([
            ...conversation,
            {
                content:
                    error.response && error.response.status && error.response.status === 403
                        ? 'Messeges Limit Exceeded'
                        : error?.response?.status === 400
                          ? 'Message Is Too Long'
                          : 'Network Error',
                role: 'assistant',
            },
        ]);
        openSnackbar('Failed to send message', SnackbarStatus.ERROR);
        setErrorMessage(messageContent);
    };

    const onCloseStream = (message: MessageType) => {
        setMessages((prevMessages) => [
            ...prevMessages.slice(0, -1),
            { ...prevMessages[prevMessages.length - 1], _id: message._id, userAnnotation: message.userAnnotation },
        ]);
    };

    const onStreamMessage = (assistantMessagePart: string) => {
        setIsMessageLoading(false);
        setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                return [
                    ...prevMessages.slice(0, -1),
                    { ...lastMessage, content: lastMessage.content + assistantMessagePart },
                ];
            }

            return [...prevMessages, { content: assistantMessagePart, role: 'assistant' }];
        });
        setErrorMessage(null);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const handleVoiceTranscription = (transcribedText: string) => {
        // 将转录文本添加到现有消息中，而不是替换
        setMessage(prevMessage => {
            const newMessage = prevMessage ? `${prevMessage} ${transcribedText}` : transcribedText;
            return newMessage;
        });
        setErrorMessage(null);
        // 显示成功提示
        openSnackbar('语音转录完成，您可以编辑后发送', SnackbarStatus.SUCCESS);
    };

    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                width: isMobile ? '95%' : '85%',
                alignItems: 'center',
            }}
        >
            {errorMessage ? (
                <Button
                    variant="contained"
                    onClick={() => {
                        setMessage(errorMessage);
                        handleSendMessage();
                    }}
                    style={{ width: 'fit-content', marginBottom: '24px' }}
                >
                    Resend Message
                </Button>
            ) : (
                <StyledInputBox>
                    <StyledInputBase
                        fullWidth
                        placeholder="Type a message…"
                        multiline
                        maxRows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        fontSize={fontSize === 'sm' ? '1rem' : '1.25rem'}
                    />
                    <Box display="flex" alignItems="center">
                        {whisperConfig?.enabled && (
                            <VoiceInputButton
                                onTranscriptionComplete={handleVoiceTranscription}
                                disabled={false}
                                experimentId={experimentId}
                            />
                        )}
                        <IconButton color="primary" onClick={handleSendMessage}>
                            <SendIcon />
                        </IconButton>
                    </Box>
                </StyledInputBox>
            )}
        </Box>
    );
};

export default InputBox;
