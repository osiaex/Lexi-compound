import { Box, Typography, Card, CardContent } from '@mui/material';
import React from 'react';

export const SettingsPanel = ({}) => {
    return (
        <Box
            style={{ maxWidth: 'lg', width: '100%', padding: '2%', height: '90vh', overflow: 'auto' }}
        >
            <Typography variant="h4" gutterBottom>
                System Settings
            </Typography>
            
            {/* System Information */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        System Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        • PyLips Integration: Enabled<br/>
                        • TTS Services: System TTS + OpenAI<br/>
                        • Real-time Expression Control: Available<br/>
                        • Whisper Speech Recognition: Supported
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};
