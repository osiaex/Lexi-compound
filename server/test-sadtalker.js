#!/usr/bin/env node

const { sadTalkerService } = require('./build/services/sadtalker.service');
const { ttsService } = require('./build/services/tts.service');

async function testSadTalkerIntegration() {
    console.log('🧪 Testing SadTalker Integration...\n');
    
    // 1. 检查 SadTalker 服务健康状态
    console.log('1. Checking SadTalker service health...');
    try {
        const isHealthy = await sadTalkerService.checkServiceHealth();
        console.log(`   ✅ SadTalker health: ${isHealthy ? 'OK' : 'FAILED'}`);
        
        if (!isHealthy) {
            console.log('   ❌ SadTalker service is not available. Please check:');
            console.log('   - SadTalker directory exists at ../SadTalker');
            console.log('   - inference.py exists in SadTalker directory');
            console.log('   - Python environment is set up correctly');
            return;
        }
    } catch (error) {
        console.log(`   ❌ SadTalker health check failed: ${error.message}`);
        return;
    }
    
    // 2. 检查 TTS 服务
    console.log('\n2. Checking TTS services...');
    const ttsAvailable = ttsService.isAvailable();
    console.log(`   ${ttsAvailable ? '✅' : '⚠️ '} OpenAI TTS: ${ttsAvailable ? 'OK' : 'Not available (no API key)'}`);
    
    // 检查 EdgeTTS
    try {
        const { execSync } = require('child_process');
        execSync('python -m edge_tts --help', { stdio: 'ignore' });
        console.log('   ✅ EdgeTTS: Available');
    } catch (error) {
        console.log('   ⚠️  EdgeTTS: Not installed (will auto-install on first use)');
    }
    
    if (!ttsAvailable) {
        console.log('   ℹ️  Will use EdgeTTS as fallback for TTS generation');
    }
    
    // 3. 测试默认头像获取
    console.log('\n3. Testing default avatar...');
    try {
        const defaultAvatar = sadTalkerService.getDefaultAvatar();
        console.log(`   ✅ Default avatar: ${defaultAvatar ? 'Available' : 'Not found'}`);
    } catch (error) {
        console.log(`   ❌ Default avatar failed: ${error.message}`);
    }
    
    // 4. 测试 TTS 生成（可选）
    console.log('\n4. Testing TTS generation (optional)...');
    try {
        console.log('   📝 Generating test speech...');
        const testText = "Hello, this is a test message for SadTalker integration.";
        const audioBase64 = await ttsService.textToSpeech(testText);
        console.log(`   ✅ TTS generation: ${audioBase64 ? 'Success' : 'Failed'}`);
        console.log(`   📊 Audio data length: ${audioBase64 ? audioBase64.length : 0} characters`);
    } catch (error) {
        console.log(`   ❌ TTS generation failed: ${error.message}`);
    }
    
    console.log('\n🎉 SadTalker integration test completed!');
    console.log('\n💡 Tips:');
    console.log('   - Make sure SadTalker dependencies are installed');
    console.log('   - Verify Python environment has required packages');
    console.log('   - Check GPU/CPU availability for faster processing');
    console.log('   - Ensure sufficient disk space for temporary files');
}

// 运行测试
testSadTalkerIntegration().catch(console.error); 