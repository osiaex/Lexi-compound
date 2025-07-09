import { getConversation, updateUserAnnotation } from '@DAL/server-requests/conversations';
import FinishConversationDialog from '@components/common/FinishConversationDialog';
import LoadingPage from '@components/common/LoadingPage';
import { SnackbarStatus, useSnackbar } from '@contexts/SnackbarProvider';
import { useConversationId } from '@hooks/useConversationId';
import useEffectAsync from '@hooks/useEffectAsync';
import { Dialog, Grid, useMediaQuery, Box, Typography } from '@mui/material';
import theme from '@root/Theme';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExperimentCoversationForms, getExperimentFeatures } from '../../DAL/server-requests/experiments';
import { ConversationForm } from '../../components/forms/conversation-form/ConversationForm';
import { useExperimentId } from '../../hooks/useExperimentId';
import { UserAnnotation } from '../../models/AppModels';
import { MainContainer, MessageListContainer, SectionContainer, SectionInnerContainer } from './ChatPage.s';
import MessageList from './components/MessageList';
import InputBox from './components/input-box/InputBox';
import { SidebarChat } from './components/side-bar-chat/SideBarChat';
import AvatarUploader from './components/AvatarUploader';

interface ChatPageProps {
    isFinishDialogOpen: boolean;
    setIsFinishDialogOpen: (open: boolean) => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ isFinishDialogOpen, setIsFinishDialogOpen }) => {
    const navigate = useNavigate();
    const messagesRef = useRef(null);
    const { openSnackbar } = useSnackbar();
    const [messages, setMessages] = useState([]);
    const [conversationForms, setConversationForms] = useState({
        preConversation: null,
        postConversation: null,
    });
    const [messageFontSize, setMessageFontSize] = useState<'sm' | 'lg'>('lg');
    const [surveyOpen, setIsSurveyOpen] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [experimentFeatures, setExperimentFeatures] = useState(null);
    const [isMessageLoading, setIsMessageLoading] = useState(false);
    const [hasCustomAvatar, setHasCustomAvatar] = useState(false);
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const questionnaireLink = 'https://docs.google.com/forms/u/0/?tgif=d&ec=asw-forms-hero-goto';
    const conversationId = useConversationId();
    const experimentId = useExperimentId();

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages]);

    useEffectAsync(async () => {
        const preConversationFormAnsweredKey = `preConversationFormAnswered-${conversationId}`;
        const preConversationFormAnsweredKeyAnswered = sessionStorage.getItem(preConversationFormAnsweredKey);
        try {
            const [conversation, conversationForms, experimentFeaturesRes] = await Promise.all([
                getConversation(conversationId),
                getExperimentCoversationForms(experimentId),
                getExperimentFeatures(experimentId),
            ]);
            if (!preConversationFormAnsweredKeyAnswered && conversationForms.preConversation) {
                setIsSurveyOpen(true);
            }
            setConversationForms(conversationForms);
            setExperimentFeatures(experimentFeaturesRes);
            setMessages(conversation.length ? conversation : []);
            
            // 检查是否有自定义头像
            if (experimentFeaturesRes?.sadTalker?.enabled) {
                checkUserAvatar();
            }
            
            setIsPageLoading(false);
        } catch (err) {
            openSnackbar('Failed to load conversation', SnackbarStatus.ERROR);
            navigate(-1);
        }
    }, []);

    const handlePreConversationSurveyDone = () => {
        const preConversationFormAnsweredKey = `preConversationFormAnswered-${conversationId}`;
        sessionStorage.setItem(preConversationFormAnsweredKey, 'true');
        setIsSurveyOpen(false);
    };

    const checkUserAvatar = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/sadtalker/user-avatar/${conversationId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.avatarUrl) {
                    setHasCustomAvatar(true);
                    setCurrentAvatarUrl(data.avatarUrl);
                }
            }
        } catch (error) {
            console.error('Failed to check user avatar:', error);
        }
    };

    const handleUpdateUserAnnotation = async (messageId: string, userAnnotation: UserAnnotation) => {
        try {
            await updateUserAnnotation(messageId, userAnnotation);
            setMessages(
                messages.map((message) => (message._id === messageId ? { ...message, userAnnotation } : message)),
            );
        } catch (error) {
            console.log(error);
        }
    };

    const handleAvatarUpload = (success: boolean) => {
        if (success) {
            setHasCustomAvatar(true);
            openSnackbar('头像上传成功！', SnackbarStatus.SUCCESS);
            // 重新检查头像状态
            checkUserAvatar();
        } else {
            openSnackbar('头像上传失败', SnackbarStatus.ERROR);
        }
    };

    // 检查是否启用了 SadTalker 功能和自定义头像功能
    const isSadTalkerEnabled = experimentFeatures?.sadTalker?.enabled;
    const isCustomAvatarAllowed = experimentFeatures?.sadTalker?.customAvatar;
    const shouldShowAvatarUploader = isSadTalkerEnabled && isCustomAvatarAllowed;

    return isPageLoading ? (
        <LoadingPage />
    ) : (
        <MainContainer container>
            {!isMobile && (
                <Grid item xs={2} sm={2} md={2} lg={2} style={{ backgroundColor: '#f5f5f5' }}>
                    <SidebarChat
                        setIsOpen={setIsFinishDialogOpen}
                        setMessageFontSize={setMessageFontSize}
                        messageFontSize={messageFontSize}
                    />
                </Grid>
            )}
            <Grid item xs={12} sm={10} md={10} lg={10}>
                <SectionContainer>
                    <SectionInnerContainer container direction="column">
                        <MessageListContainer ref={messagesRef} item>
                            <MessageList
                                isMobile={isMobile}
                                messages={messages}
                                isMessageLoading={isMessageLoading}
                                size={messageFontSize}
                                handleUpdateUserAnnotation={handleUpdateUserAnnotation}
                                experimentHasUserAnnotation={experimentFeatures?.userAnnotation}
                                experimentFeatures={experimentFeatures}
                            />
                        </MessageListContainer>
                        <Grid item display={'flex'} justifyContent={'center'} flexDirection="column" alignItems="center">
                            {/* 头像上传功能 - 只在启用 SadTalker 时显示 */}
                            {shouldShowAvatarUploader && (
                                <Grid item style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {hasCustomAvatar && currentAvatarUrl && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <img 
                                                src={`${process.env.REACT_APP_API_URL}${currentAvatarUrl}`}
                                                alt="Current Avatar" 
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    border: '2px solid #4caf50'
                                                }}
                                            />
                                            <Typography variant="caption" color="success.main">
                                                ✓ 自定义头像已设置
                                            </Typography>
                                        </Box>
                                    )}
                                    <AvatarUploader 
                                        conversationId={conversationId}
                                        onAvatarUploaded={handleAvatarUpload}
                                    />
                                </Grid>
                            )}
                            <InputBox
                                isMobile={isMobile}
                                messages={messages}
                                setMessages={setMessages}
                                conversationId={conversationId}
                                setIsMessageLoading={setIsMessageLoading}
                                fontSize={messageFontSize}
                                isStreamMessage={experimentFeatures?.streamMessage}
                                experimentFeatures={experimentFeatures}
                            />
                        </Grid>
                    </SectionInnerContainer>
                </SectionContainer>
            </Grid>
            {isFinishDialogOpen && (
                <FinishConversationDialog
                    open={isFinishDialogOpen}
                    setIsOpen={setIsFinishDialogOpen}
                    questionnaireLink={questionnaireLink}
                    form={conversationForms.postConversation}
                />
            )}
            <Dialog
                open={surveyOpen}
                maxWidth={'lg'}
                fullScreen={isMobile}
                PaperProps={{
                    style: {
                        maxHeight: isMobile ? 'none' : '70vh',
                        overflow: 'auto',
                    },
                }}
            >
                <ConversationForm
                    form={conversationForms.preConversation}
                    isPreConversation={true}
                    handleDone={handlePreConversationSurveyDone}
                />
            </Dialog>
        </MainContainer>
    );
};

export default ChatPage;
