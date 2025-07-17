<<<<<<< HEAD
import mongoose from 'mongoose';

export interface ABAgents {
    agentA: string;
    distA: number;
    agentB: string;
    distB: number;
}

export interface DisplaySettings {
    welcomeContent: string;
    welcomeHeader: string;
}

export interface ExperimentForms {
    registration: string;
    preConversation: string;
    postConversation: string;
}

export interface ExperimentFeatures {
    userAnnotation: boolean;
    streamMessage: boolean;
}

export interface WhisperSettings {
    enabled: boolean;
    modelSize: 'tiny' | 'small';
    language: 'zh' | 'en' | 'auto';
    temperature: number;
    maxFileSize: number;
    maxDuration: number;
}

export interface IExperimentLean {
    _id: mongoose.Types.ObjectId;
    title: string;
}

export interface IExperiment {
    _id: mongoose.Types.ObjectId;
    agentsMode: string;
    activeAgent: string;
    abAgents: ABAgents;
    createdAt: Date;
    timestamp: number;
    displaySettings: DisplaySettings;
    isActive: boolean;
    title: string;
    description: string;
    numberOfParticipants: number;
    experimentForms: ExperimentForms;
    maxMessages: number;
    maxConversations: number;
    maxParticipants: number;
    totalSessions: number;
    openSessions: number;
    experimentFeatures: ExperimentFeatures;
    whisperSettings?: WhisperSettings;
}
=======
import mongoose from 'mongoose';

export interface ABAgents {
    agentA: string;
    distA: number;
    agentB: string;
    distB: number;
}

export interface DisplaySettings {
    welcomeContent: string;
    welcomeHeader: string;
}

export interface ExperimentForms {
    registration: string;
    preConversation: string;
    postConversation: string;
}

export interface ExperimentFeatures {
    userAnnotation: boolean;
    streamMessage: boolean;
    sadTalker: {
        enabled: boolean;
        autoPlay: boolean;
        ttsService: 'openai' | 'edgetts';
        edgeTtsVoice?: string;
    };
}

export interface IExperimentLean {
    _id: mongoose.Types.ObjectId;
    title: string;
}

export interface IExperiment {
    _id: mongoose.Types.ObjectId;
    agentsMode: string;
    activeAgent: string;
    abAgents: ABAgents;
    createdAt: Date;
    timestamp: number;
    displaySettings: DisplaySettings;
    isActive: boolean;
    title: string;
    description: string;
    numberOfParticipants: number;
    experimentForms: ExperimentForms;
    maxMessages: number;
    maxConversations: number;
    maxParticipants: number;
    totalSessions: number;
    openSessions: number;
    experimentFeatures: ExperimentFeatures;
}
>>>>>>> 399a6bc00e2a6010e154a1560a20838e0d7632ea
