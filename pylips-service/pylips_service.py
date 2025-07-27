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

# Windows SAPI TTS备用实现
try:
    import win32com.client
    WIN32_SAPI_AVAILABLE = True
except ImportError:
    WIN32_SAPI_AVAILABLE = False

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
        self.sapi_tts = None
        self.tts_lock = threading.Lock()  # 添加线程锁确保TTS线程安全
        
        # 初始化Windows SAPI TTS（优先使用，更稳定）
        if WIN32_SAPI_AVAILABLE:
            try:
                self.sapi_tts = win32com.client.Dispatch("SAPI.SpVoice")
                logger.info("Windows SAPI TTS引擎已初始化")
            except Exception as e:
                logger.error(f"初始化Windows SAPI TTS失败: {e}")
                self.sapi_tts = None
        
        # 初始化pyttsx3备用TTS（作为第二选择）
        if PYTTSX3_AVAILABLE and not self.sapi_tts:
            try:
                self.fallback_tts = pyttsx3.init()
                logger.info("pyttsx3备用TTS引擎已初始化")
            except Exception as e:
                logger.error(f"初始化pyttsx3备用TTS失败: {e}")
                self.fallback_tts = None
        
    def start_face_server(self):
        """启动PyLips面孔服务器"""
        if self.face_server_running:
            return True
            
        try:
            # 检查端口8000是否已被占用
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', 8000))
            sock.close()
            
            if result == 0:
                logger.info("端口8000已被占用，假设PyLips面孔服务器已在运行")
                self.face_server_running = True
                return True
            
            # 启动PyLips面孔服务器
            import subprocess
            env = os.environ.copy()
            env['PYTHONPATH'] = os.path.join(os.path.dirname(__file__), '..', '..', 'PyLips')
            
            # 使用更详细的启动命令
            cmd = [sys.executable, '-m', 'pylips.face.start', '--host', '0.0.0.0', '--port', '8000']
            logger.info(f"启动命令: {' '.join(cmd)}")
            logger.info(f"工作目录: {os.path.join(os.path.dirname(__file__), '..', '..', 'PyLips')}")
            
            self.face_server_process = subprocess.Popen(
                cmd,
                env=env, 
                cwd=os.path.join(os.path.dirname(__file__), '..', '..', 'PyLips'),
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True
            )
            
            # 等待服务器启动并检查状态
            for i in range(10):  # 最多等待10秒
                time.sleep(1)
                
                # 检查进程是否仍在运行
                if self.face_server_process.poll() is not None:
                    # 进程已退出，捕获输出
                    out, err = self.face_server_process.communicate()
                    logger.error(f"PyLips面孔服务器启动失败，已退出。输出: {out}\n错误: {err}")
                    self.face_server_running = False
                    return False
                
                # 检查端口是否可用
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                result = sock.connect_ex(('localhost', 8000))
                sock.close()
                
                if result == 0:
                    self.face_server_running = True
                    logger.info(f"PyLips面孔服务器已启动 (等待了{i+1}秒)")
                    return True
                    
                logger.info(f"等待PyLips面孔服务器启动... ({i+1}/10)")
            
            # 超时后检查进程状态
            if self.face_server_process.poll() is None:
                logger.warning("PyLips面孔服务器进程仍在运行，但端口8000不可访问")
                # 尝试获取部分输出用于调试
                try:
                    out, err = self.face_server_process.communicate(timeout=1)
                    logger.info(f"服务器输出: {out}")
                    if err:
                        logger.warning(f"服务器错误: {err}")
                except subprocess.TimeoutExpired:
                    logger.info("服务器仍在运行，无法获取输出")
            
            return False
                
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
        # 更新当前配置
        self.current_voice_id = voice_id
        self.tts_method = tts_method
        
        # 如果有Windows SAPI TTS，立即更新语音设置
        if self.sapi_tts and voice_id:
            try:
                voice_tokens = self.sapi_tts.GetVoices()
                for i in range(voice_tokens.Count):
                    voice = voice_tokens.Item(i)
                    if voice.Id == voice_id:
                        self.sapi_tts.Voice = voice
                        logger.info(f"Windows SAPI TTS语音已更新: {voice.GetDescription()}")
                        break
            except Exception as ve:
                logger.warning(f"更新Windows SAPI语音失败: {ve}")
        
        # 初始化PyLips面孔（如果可用）
        if not RobotFace:
            logger.info(f"PyLips不可用，仅更新TTS配置 - TTS方法: {tts_method}, 语音ID: {voice_id}")
            return True
        
        # 确保面孔服务器正在运行
        if not self.face_server_running:
            logger.info("面孔服务器未运行，尝试启动...")
            if not self.start_face_server():
                logger.error("无法启动面孔服务器，跳过PyLips面孔初始化")
                return True  # 仍然返回True，因为TTS配置已更新
            
        try:
            # 多次尝试初始化，因为服务器可能需要时间完全启动
            for attempt in range(3):
                try:
                    logger.info(f"尝试初始化PyLips面孔 (第{attempt+1}次)...")
                    self.face = RobotFace(
                        robot_name='LEXI',
                        server_ip='http://localhost:8000',
                        tts_method=tts_method,
                        voice_id=voice_id
                    )
                    
                    # 测试连接
                    if hasattr(self.face, 'io'):
                        # 等待连接建立
                        time.sleep(2)
                        if hasattr(self.face.io, 'connected') and self.face.io.connected:
                            logger.info(f"机器人面孔已成功初始化并连接 - TTS方法: {tts_method}, 语音ID: {voice_id}")
                            return True
                        else:
                            logger.warning(f"第{attempt+1}次尝试：Socket.IO连接未建立")
                    else:
                        logger.info(f"机器人面孔已初始化 (无Socket.IO检查) - TTS方法: {tts_method}, 语音ID: {voice_id}")
                        return True
                        
                except Exception as attempt_e:
                    logger.warning(f"第{attempt+1}次初始化尝试失败: {attempt_e}")
                    if attempt < 2:  # 不是最后一次尝试
                        time.sleep(2)  # 等待后重试
                        continue
                    else:
                        raise attempt_e
            
            logger.error("所有初始化尝试都失败了")
            return True  # 仍然返回True，因为TTS配置已更新
            
        except Exception as e:
            logger.error(f"初始化机器人面孔失败: {e}")
            # 即使PyLips初始化失败，配置更新仍然成功
            return True
    
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
        
        # 优先使用Windows SAPI TTS（更稳定，无线程冲突）
        if self.sapi_tts:
            try:
                if wait:
                    # 同步模式
                    self.sapi_tts.Speak(text)
                else:
                    # 异步模式：SAPI支持异步播放，无需额外线程处理
                    self.sapi_tts.Speak(text, 1)  # 1表示异步播放
                
                # 获取当前使用的语音信息用于日志
                current_voice_name = "默认语音"
                try:
                    current_voice_name = self.sapi_tts.Voice.GetDescription()
                except:
                    pass
                logger.info(f"Windows SAPI TTS播放 ({current_voice_name}): {text[:50]}...")
                return True
            except Exception as e:
                logger.error(f"Windows SAPI TTS播放失败: {e}")
        
        # 备用TTS（pyttsx3）
        if self.fallback_tts:
            try:
                if wait:
                    # 同步模式：使用主TTS引擎
                    with self.tts_lock:
                        self.fallback_tts.say(text)
                        self.fallback_tts.runAndWait()
                else:
                    # 异步模式：创建独立的TTS引擎实例避免冲突
                    def speak_async():
                        try:
                            async_tts = pyttsx3.init()
                            async_tts.say(text)
                            async_tts.runAndWait()
                        except Exception as e:
                            logger.error(f"异步TTS播放失败: {e}")
                    threading.Thread(target=speak_async, daemon=True).start()
                logger.info(f"pyttsx3备用TTS播放: {text[:50]}...")
                return True
            except Exception as e:
                logger.error(f"pyttsx3备用TTS播放失败: {e}")
        
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
    
    def set_appearance(self, appearance_config):
        """设置面孔外观"""
        if not self.face:
            logger.warning("PyLips面孔未初始化，无法设置外观")
            return False
            
        try:
            # 检查Socket.IO连接状态
            if hasattr(self.face, 'io') and hasattr(self.face.io, 'connected'):
                if not self.face.io.connected:
                    logger.error("Socket.IO连接已断开，尝试重新连接...")
                    try:
                        self.face.io.connect()
                        time.sleep(1)  # 等待连接建立
                    except Exception as conn_e:
                        logger.error(f"重新连接失败: {conn_e}")
                        return False
            
            self.face.set_appearance(appearance_config)
            logger.info(f"面孔外观已更新: {appearance_config}")
            return True
            
        except Exception as e:
            logger.error(f"设置面孔外观失败: {e}")
            # 如果是连接问题，尝试重新初始化面孔
            if "not a connected namespace" in str(e) or "connection" in str(e).lower():
                logger.info("检测到连接问题，尝试重新初始化面孔...")
                try:
                    self.initialize_face(self.current_voice_id, self.tts_method)
                    time.sleep(2)  # 等待初始化完成
                    if self.face:
                        self.face.set_appearance(appearance_config)
                        logger.info(f"重新初始化后面孔外观已更新: {appearance_config}")
                        return True
                except Exception as reinit_e:
                    logger.error(f"重新初始化失败: {reinit_e}")
            return False

# 全局服务实例
pylips_service = PyLipsService()

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    status = 'healthy' if pylips_service.face_server_running and pylips_service.face is not None else 'unavailable'
    return jsonify({
        'status': status,
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
            'face_url': 'http://localhost:8000/face/LEXI'  # 添加robot_name
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

@app.route('/appearance', methods=['POST'])
def set_appearance():
    """设置面孔外观"""
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': '缺少外观配置参数'}), 400
    
    success = pylips_service.set_appearance(data)
    
    if success:
        return jsonify({
            'success': True,
            'message': '面孔外观已更新',
            'config': data
        })
    else:
        return jsonify({
            'success': False,
            'message': '设置面孔外观失败'
        }), 500

@app.route('/voices', methods=['GET'])
def get_voices():
    """获取可用语音包列表"""
    try:
        tts_method = request.args.get('tts_method', 'system')
        
        if tts_method == 'system':
            # 获取系统TTS语音列表
            if PYLIPS_AVAILABLE:
                from pylips.speech import SystemTTS
                system_tts = SystemTTS()
                raw_voices = system_tts.voices
                voices = [{'id': voice, 'name': voice} for voice in raw_voices]
            elif WIN32_SAPI_AVAILABLE:
                # 优先使用Windows SAPI获取语音列表
                try:
                    sapi_voices = win32com.client.Dispatch("SAPI.SpVoice")
                    voice_tokens = sapi_voices.GetVoices()
                    voices = []
                    for i in range(voice_tokens.Count):
                        voice = voice_tokens.Item(i)
                        voice_id = voice.Id
                        voice_name = voice.GetDescription()
                        voices.append({'id': voice_id, 'name': voice_name})
                except Exception as e:
                    logger.error(f"获取Windows SAPI语音失败: {e}")
                    voices = []
            elif PYTTSX3_AVAILABLE:
                # 备用方案：直接使用pyttsx3
                try:
                    import pyttsx3
                    engine = pyttsx3.init()
                    raw_voices = engine.getProperty('voices')
                    voices = [{'id': voice.id, 'name': voice.name or voice.id} for voice in raw_voices]
                except Exception as e:
                    logger.error(f"获取pyttsx3语音失败: {e}")
                    voices = []
            else:
                voices = []
                
            return jsonify({
                'success': True,
                'voices': voices,
                'tts_method': 'system'
            })
            
        elif tts_method == 'polly':
            # 获取Polly TTS语音列表
            if PYLIPS_AVAILABLE:
                from pylips.speech import PollyTTS
                polly_tts = PollyTTS()
                raw_voices = polly_tts.voices
                voices = [{'id': voice, 'name': voice} for voice in raw_voices]
            else:
                # 硬编码的Polly语音列表作为备用
                raw_voices = ['Zeina','Hala','Zayd','Lisa','Arlet','Hiujin','Zhiyu','Naja','Mads',
                         'Sofie','Laura','Lotte','Ruben','Nicole','Olivia','Russell','Amy','Emma',
                         'Brian','Arthur','Aditi','Raveena','Kajal','Niamh','Aria','Ayanda','Danielle',
                         'Gregory','Ivy','Joanna','Kendra','Kimberly','Salli','Joey','Justin','Kevin',
                         'Matthew','Ruth','Stephen','Geraint','Suvi','Celine','Léa','Mathieu','Rémi',
                         'Isabelle','Chantal','Gabrielle','Liam','Marlene','Vicki','Hans','Daniel',
                         'Hannah','Aditi','Kajal','Dora','Karl','Carla','Bianca','Giorgio','Adriano',
                         'Mizuki','Takumi','Kazuha','Tomoko','Seoyeon','Liv','Ida','Ewa','Maja','Jacek',
                         'Jan','Ola','Camila','Vitoria','Ricardo','Thiago','Ines','Cristiano','Carmen',
                         'Tatyana','Maxim','Conchita','Lucia','Enrique','Sergio','Mia','Andrés','Lupe',
                         'Penelope','Miguel','Pedro','Astrid','Elin','Filiz','Burcu','Gwyneth']
                voices = [{'id': voice, 'name': voice} for voice in raw_voices]
                         
            return jsonify({
                'success': True,
                'voices': voices,
                'tts_method': 'polly'
            })
            
        else:
            return jsonify({
                'success': False,
                'message': f'不支持的TTS方法: {tts_method}'
            }), 400
            
    except Exception as e:
        logger.error(f"获取语音列表失败: {e}")
        return jsonify({
            'success': False,
            'message': f'获取语音列表失败: {str(e)}'
        }), 500

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
    print("- POST /appearance - 设置面孔外观")
    print("- GET /status - 获取状态")
    print("- GET /health - 健康检查")
    print("- GET /voices - 获取可用语音列表")
    
    # 启动Flask应用
    app.run(host='0.0.0.0', port=3001, debug=False)