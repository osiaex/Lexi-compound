#!/usr/bin/env python3
"""
PyLips微服务 - 为LEXI项目提供TTS和人脸动画控制
"""

import os
import sys
import time
import threading
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import logging

# 添加PyLips到路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'PyLips'))

try:
    from pylips.speech import RobotFace
    from pylips.face import FacePresets, ExpressionPresets
    PYLIPS_AVAILABLE = True
except ImportError as e:
    print(f"警告: PyLips模块导入失败: {e}")
    print("将使用备用TTS功能")
    RobotFace = None
    PYLIPS_AVAILABLE = False

# 备用TTS实现
try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    print("警告: pyttsx3不可用，TTS功能将受限")
    PYTTSX3_AVAILABLE = False

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5000"])  # 允许前端和LEXI后端访问
socketio = SocketIO(app, cors_allowed_origins="*")

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PyLipsService:
    def __init__(self):
        self.face = None
        self.face_server_process = None
        self.face_server_running = False
        self.current_voice_id = None
        self.tts_method = 'system'
        self.fallback_tts = None
        
        # 初始化备用TTS
        if PYTTSX3_AVAILABLE and not PYLIPS_AVAILABLE:
            try:
                self.fallback_tts = pyttsx3.init()
                logger.info("备用TTS引擎已初始化")
            except Exception as e:
                logger.error(f"初始化备用TTS失败: {e}")
                self.fallback_tts = None
        
    def start_face_server(self):
        """启动PyLips面孔服务器"""
        if self.face_server_running:
            return True
            
        try:
            # 启动PyLips面孔服务器
            import subprocess
            env = os.environ.copy()
            env['PYTHONPATH'] = os.path.join(os.path.dirname(__file__), '..', '..', 'PyLips')
            
            self.face_server_process = subprocess.Popen([
                sys.executable, '-m', 'pylips.face.start'
            ], env=env, cwd=os.path.join(os.path.dirname(__file__), '..', '..', 'PyLips'))
            
            # 等待服务器启动
            time.sleep(3)
            self.face_server_running = True
            logger.info("PyLips面孔服务器已启动")
            return True
            
        except Exception as e:
            logger.error(f"启动PyLips面孔服务器失败: {e}")
            return False
    
    def stop_face_server(self):
        """停止PyLips面孔服务器"""
        if self.face_server_process:
            self.face_server_process.terminate()
            self.face_server_process = None
            self.face_server_running = False
            logger.info("PyLips面孔服务器已停止")
    
    def initialize_face(self, voice_id=None, tts_method='system'):
        """初始化机器人面孔"""
        if not RobotFace:
            return False
            
        try:
            self.face = RobotFace(
                robot_name='LEXI',
                server_ip='http://localhost:8000',
                tts_method=tts_method,
                voice_id=voice_id
            )
            self.current_voice_id = voice_id
            self.tts_method = tts_method
            logger.info(f"机器人面孔已初始化 - TTS方法: {tts_method}, 语音ID: {voice_id}")
            return True
            
        except Exception as e:
            logger.error(f"初始化机器人面孔失败: {e}")
            return False
    
    def speak(self, text, wait=False):
        """让机器人说话"""
        # 优先使用PyLips
        if self.face:
            try:
                self.face.say(text, wait=wait)
                logger.info(f"PyLips语音播放: {text[:50]}...")
                return True
            except Exception as e:
                logger.error(f"PyLips语音播放失败: {e}")
        
        # 备用TTS
        if self.fallback_tts:
            try:
                self.fallback_tts.say(text)
                if wait:
                    self.fallback_tts.runAndWait()
                else:
                    # 在新线程中运行以避免阻塞
                    def speak_async():
                        self.fallback_tts.runAndWait()
                    threading.Thread(target=speak_async, daemon=True).start()
                logger.info(f"备用TTS播放: {text[:50]}...")
                return True
            except Exception as e:
                logger.error(f"备用TTS播放失败: {e}")
        
        logger.error("所有TTS方法都不可用")
        return False
    
    def set_expression(self, expression_name, duration=1000):
        """设置面部表情"""
        # 优先使用PyLips
        if self.face:
            try:
                # 预定义表情映射
                expressions = {
                    'happy': {'AU6l': 0.8, 'AU6r': 0.8, 'AU12l': 0.6, 'AU12r': 0.6},
                    'sad': {'AU1l': 0.5, 'AU1r': 0.5, 'AU4l': 0.4, 'AU4r': 0.4, 'AU15l': 0.3, 'AU15r': 0.3},
                    'surprised': {'AU1l': 0.8, 'AU1r': 0.8, 'AU2l': 0.6, 'AU2r': 0.6, 'AU5l': 0.7, 'AU5r': 0.7},
                    'angry': {'AU4l': 0.8, 'AU4r': 0.8, 'AU7l': 0.6, 'AU7r': 0.6, 'AU23l': 0.4, 'AU23r': 0.4},
                    'neutral': {}
                }
                
                if expression_name in expressions:
                    self.face.express(expressions[expression_name], duration)
                    logger.info(f"PyLips设置表情: {expression_name}")
                    return True
                else:
                    logger.warning(f"未知表情: {expression_name}")
                    return False
                    
            except Exception as e:
                logger.error(f"PyLips设置表情失败: {e}")
        
        # 备用表情反馈（仅记录日志）
        if not PYLIPS_AVAILABLE:
            logger.info(f"备用表情模式 - 表情: {expression_name}, 持续时间: {duration}ms")
            # 这里可以添加其他表情反馈机制，比如发送到前端显示文字表情
            return True
        
        return False
    
    def look_at(self, x, y, z, duration=1000):
        """控制注视方向"""
        if not self.face:
            return False
            
        try:
            self.face.look(x, y, z, duration)
            logger.info(f"注视方向: ({x}, {y}, {z})")
            return True
            
        except Exception as e:
            logger.error(f"控制注视失败: {e}")
            return False
    
    def stop_speech(self):
        """停止当前语音"""
        if not self.face:
            return False
            
        try:
            self.face.stop_speech()
            logger.info("已停止语音")
            return True
            
        except Exception as e:
            logger.error(f"停止语音失败: {e}")
            return False

# 全局服务实例
pylips_service = PyLipsService()

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'face_server_running': pylips_service.face_server_running,
        'face_initialized': pylips_service.face is not None
    })

@app.route('/start', methods=['POST'])
def start_service():
    """启动PyLips服务"""
    success = pylips_service.start_face_server()
    if success:
        # 等待服务器完全启动后初始化面孔
        time.sleep(2)
        data = request.get_json() or {}
        voice_id = data.get('voice_id')
        tts_method = data.get('tts_method', 'system')
        
        face_init = pylips_service.initialize_face(voice_id, tts_method)
        
        return jsonify({
            'success': True,
            'message': 'PyLips服务已启动',
            'face_initialized': face_init,
            'face_url': 'http://localhost:8000/face'
        })
    else:
        return jsonify({
            'success': False,
            'message': '启动PyLips服务失败'
        }), 500

@app.route('/stop', methods=['POST'])
def stop_service():
    """停止PyLips服务"""
    pylips_service.stop_face_server()
    pylips_service.face = None
    
    return jsonify({
        'success': True,
        'message': 'PyLips服务已停止'
    })

@app.route('/speak', methods=['POST'])
def speak():
    """语音合成并播放"""
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'success': False, 'message': '缺少text参数'}), 400
    
    text = data['text']
    wait = data.get('wait', False)
    
    success = pylips_service.speak(text, wait)
    
    if success:
        return jsonify({
            'success': True,
            'message': f'开始播放语音: {text[:50]}...'
        })
    else:
        return jsonify({
            'success': False,
            'message': '语音播放失败'
        }), 500

@app.route('/expression', methods=['POST'])
def set_expression():
    """设置面部表情"""
    data = request.get_json()
    
    if not data or 'expression' not in data:
        return jsonify({'success': False, 'message': '缺少expression参数'}), 400
    
    expression = data['expression']
    duration = data.get('duration', 1000)
    
    success = pylips_service.set_expression(expression, duration)
    
    if success:
        return jsonify({
            'success': True,
            'message': f'设置表情: {expression}'
        })
    else:
        return jsonify({
            'success': False,
            'message': '设置表情失败'
        }), 500

@app.route('/look', methods=['POST'])
def look():
    """控制注视方向"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ['x', 'y', 'z']):
        return jsonify({'success': False, 'message': '缺少x, y, z参数'}), 400
    
    x = data['x']
    y = data['y']
    z = data['z']
    duration = data.get('duration', 1000)
    
    success = pylips_service.look_at(x, y, z, duration)
    
    if success:
        return jsonify({
            'success': True,
            'message': f'注视方向: ({x}, {y}, {z})'
        })
    else:
        return jsonify({
            'success': False,
            'message': '控制注视失败'
        }), 500

@app.route('/stop-speech', methods=['POST'])
def stop_speech():
    """停止当前语音"""
    success = pylips_service.stop_speech()
    
    if success:
        return jsonify({
            'success': True,
            'message': '已停止语音'
        })
    else:
        return jsonify({
            'success': False,
            'message': '停止语音失败'
        }), 500

@app.route('/config', methods=['POST'])
def update_config():
    """更新配置"""
    data = request.get_json()
    
    voice_id = data.get('voice_id')
    tts_method = data.get('tts_method', 'system')
    
    # 重新初始化面孔以应用新配置
    success = pylips_service.initialize_face(voice_id, tts_method)
    
    if success:
        return jsonify({
            'success': True,
            'message': '配置已更新',
            'voice_id': voice_id,
            'tts_method': tts_method
        })
    else:
        return jsonify({
            'success': False,
            'message': '更新配置失败'
        }), 500

@app.route('/status', methods=['GET'])
def get_status():
    """获取服务状态"""
    return jsonify({
        'face_server_running': pylips_service.face_server_running,
        'face_initialized': pylips_service.face is not None,
        'current_voice_id': pylips_service.current_voice_id,
        'tts_method': pylips_service.tts_method
    })

if __name__ == '__main__':
    print("启动PyLips微服务...")
    print("API端点:")
    print("- POST /start - 启动服务")
    print("- POST /stop - 停止服务") 
    print("- POST /speak - 语音播放")
    print("- POST /expression - 设置表情")
    print("- POST /look - 控制注视")
    print("- POST /stop-speech - 停止语音")
    print("- POST /config - 更新配置")
    print("- GET /status - 获取状态")
    print("- GET /health - 健康检查")
    
    # 启动Flask应用
    app.run(host='0.0.0.0', port=3001, debug=False)