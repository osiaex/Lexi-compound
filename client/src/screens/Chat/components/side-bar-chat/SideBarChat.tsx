import FontSizeSwitch from '@components/common/FontSizeSwitch';
import ExitToAppOutlinedIcon from '@mui/icons-material/ExitToAppOutlined';
import { SmartToy as BotIcon } from '@mui/icons-material';
import { Box, ListItem, Switch, FormControlLabel } from '@mui/material';
import { ListItemText, StyledListItemIcon } from '../../../Admin/components/sidebar-admin/SideBar.s';
import { StyledList, StyledListItem } from './SideBarChat.s';

interface SidebarProps {
    setIsOpen: (open: boolean) => void;
    setMessageFontSize: (size: 'sm' | 'lg') => void;
    messageFontSize: 'sm' | 'lg';
    showDIDAgent?: boolean;
    onToggleDIDAgent?: () => void;
}

export const SidebarChat: React.FC<SidebarProps> = ({ 
    setIsOpen, 
    messageFontSize, 
    setMessageFontSize,
    showDIDAgent = false,
    onToggleDIDAgent
}) => (
    <StyledList>
        <Box>
            <StyledListItem onClick={() => setIsOpen(true)}>
                <StyledListItemIcon>
                    <ExitToAppOutlinedIcon />
                    <ListItemText>Finish</ListItemText>
                </StyledListItemIcon>
            </StyledListItem>
            <ListItem>
                <ListItemText textAlign={'left'} sx={{ fontSize: '0.875rem' }}>
                    To conclude, click 'Finish' and complete a short questionnaire. Thank you for your cooperation!
                </ListItemText>
            </ListItem>
        </Box>

        {/* D-ID Agent 控制开关 */}
        {onToggleDIDAgent && (
            <Box paddingLeft={'16px'} paddingY={1}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={showDIDAgent}
                            onChange={onToggleDIDAgent}
                            size="small"
                            color="primary"
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BotIcon fontSize="small" />
                            <span style={{ fontSize: '0.875rem' }}>AI Avatar</span>
                        </Box>
                    }
                />
            </Box>
        )}

        <Box paddingLeft={'16px'}>
            <ListItemText width={'80%'} textAlign={'left'}>
                Font Size:
            </ListItemText>
            <FontSizeSwitch fontSize={messageFontSize} setFontSize={setMessageFontSize} />
        </Box>
    </StyledList>
);
