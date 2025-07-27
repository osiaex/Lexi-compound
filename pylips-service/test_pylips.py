#!/usr/bin/env python3
"""
PyLips服务测试脚本
用于测试PyLips服务的连接和外观设置功能
"""

import requests
import json
import time
import sys

def test_pylips_service():
    """测试PyLips服务"""
    base_url = "http://localhost:3001"
    
    print("=== PyLips服务测试 ===")
    
    # 1. 健康检查
    print("\n1. 检查服务健康状态...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✓ 服务健康状态: {health_data}")
        else:
            print(f"✗ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 无法连接到PyLips服务: {e}")
        print("请确保PyLips服务正在运行 (python pylips_service.py)")
        return False
    
    # 2. 启动服务
    print("\n2. 启动PyLips服务...")
    try:
        response = requests.post(f"{base_url}/start", json={
            "tts_method": "system",
            "voice_id": None
        })
        if response.status_code == 200:
            start_data = response.json()
            print(f"✓ 服务启动成功: {start_data}")
            time.sleep(3)  # 等待服务完全启动
        else:
            print(f"✗ 服务启动失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ 启动服务时出错: {e}")
    
    # 3. 检查状态
    print("\n3. 检查服务状态...")
    try:
        response = requests.get(f"{base_url}/status")
        if response.status_code == 200:
            status_data = response.json()
            print(f"✓ 服务状态: {status_data}")
        else:
            print(f"✗ 状态检查失败: {response.status_code}")
    except Exception as e:
        print(f"✗ 状态检查出错: {e}")
    
    # 4. 测试外观设置
    print("\n4. 测试外观设置...")
    test_appearance = {
        "iris_color": "#00FF00",
        "eye_size": 150,
        "mouth_color": "#FF0000",
        "background_color": "#CCCCCC"
    }
    
    try:
        response = requests.post(f"{base_url}/appearance", json=test_appearance)
        if response.status_code == 200:
            appearance_data = response.json()
            print(f"✓ 外观设置成功: {appearance_data}")
        else:
            print(f"✗ 外观设置失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ 外观设置出错: {e}")
        return False
    
    # 5. 测试语音
    print("\n5. 测试语音功能...")
    try:
        response = requests.post(f"{base_url}/speak", json={
            "text": "Hello, this is a test message from PyLips!",
            "wait": False
        })
        if response.status_code == 200:
            speak_data = response.json()
            print(f"✓ 语音测试成功: {speak_data}")
        else:
            print(f"✗ 语音测试失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ 语音测试出错: {e}")
    
    print("\n=== 测试完成 ===")
    print("如果外观设置成功，你可以在 http://localhost:8000/face/LEXI 查看效果")
    return True

def reset_appearance():
    """重置外观为默认设置"""
    base_url = "http://localhost:3001"
    
    default_appearance = {
        "background_color": "#D7E4F5",
        "eyeball_color": "#ffffff",
        "iris_color": "#800080",
        "eye_size": 140,
        "eye_height": 80,
        "eye_separation": 400,
        "iris_size": 80,
        "pupil_scale": 0.7,
        "eye_shine": 50,
        "eyelid_color": "#D7E4F5",
        "nose_color": "#ff99cc",
        "nose_vertical_position": -40,
        "nose_width": 0,
        "nose_height": 0,
        "mouth_color": "#2c241b",
        "mouth_width": 450,
        "mouth_height": 20,
        "mouth_thickness": 18,
        "brow_color": "#2c241b",
        "brow_width": 130,
        "brow_height": 210,
        "brow_thickness": 18
    }
    
    print("重置外观为默认设置...")
    try:
        response = requests.post(f"{base_url}/appearance", json=default_appearance)
        if response.status_code == 200:
            print("✓ 外观已重置为默认设置")
        else:
            print(f"✗ 重置失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ 重置出错: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        reset_appearance()
    else:
        test_pylips_service()
        
        # 询问是否重置外观
        try:
            choice = input("\n是否重置外观为默认设置? (y/n): ")
            if choice.lower() in ['y', 'yes', '是']:
                reset_appearance()
        except KeyboardInterrupt:
            print("\n测试结束")