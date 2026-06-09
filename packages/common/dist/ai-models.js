"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_TAGS = exports.GEMINI_MODELS = exports.OPENAI_MODELS = void 0;
exports.OPENAI_MODELS = [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-5.4-mini',
    'gpt-5.4',
];
exports.GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3.5-flash',
];
exports.MODEL_TAGS = {
    'gpt-4o-mini': 'token efficient',
    'gpt-4o': 'token efficient',
    'gpt-5.4-mini': 'thinking',
    'gpt-5.4': 'thinking',
    'gemini-2.5-flash': 'balanced',
    'gemini-2.5-flash-lite': 'lightweight',
    'gemini-3.1-flash-lite': 'lightweight',
    'gemini-3.1-pro-preview': 'reasoning',
    'gemini-3.5-flash': 'balanced',
};
