import { Schema } from 'mongoose';
import { mongoDbProvider } from '../mongoDBProvider';
import { ABAgents, IExperiment, WhisperSettings } from '../types';

const AbAgentsSchema = new Schema<ABAgents>({
    distA: { type: Number, required: true },
    agentA: { type: String, required: true },
    distB: { type: Number, required: true },
    agentB: { type: String, required: true },
});

const WhisperSettingsSchema = new Schema<WhisperSettings>({
    enabled: { type: Boolean, default: false },
    modelSize: { type: String, enum: ['tiny', 'small'], default: 'tiny' },
    language: { type: String, enum: ['zh', 'en', 'auto'], default: 'auto' },
    temperature: { type: Number, default: 0.0, min: 0, max: 1 },
    maxFileSize: { type: Number, default: 50, min: 1, max: 100 },
    maxDuration: { type: Number, default: 300, min: 1, max: 600 },
});

export const experimentsSchema = new Schema<IExperiment>(
    {
        agentsMode: { type: String, required: true },
        activeAgent: { type: String },
        abAgents: { type: AbAgentsSchema },
        createdAt: { type: Date, default: Date.now },
        timestamp: { type: Number, default: () => Date.now() },
        displaySettings: { type: Object },
        isActive: { type: Boolean },
        title: { type: String },
        description: { type: String },
        numberOfParticipants: { type: Number, default: () => 0 },
        experimentForms: {
            registration: { type: String },
            preConversation: { type: String },
            postConversation: { type: String },
        },
        maxMessages: { type: Number },
        maxConversations: { type: Number },
        maxParticipants: { type: Number },
        totalSessions: { type: Number, default: () => 0 },
        openSessions: { type: Number, default: () => 0 },
        experimentFeatures: { type: Object },
        whisperSettings: { type: WhisperSettingsSchema },
    },
    { versionKey: false },
);

export const ExperimentsModel = mongoDbProvider.getModel('experiments', experimentsSchema);
