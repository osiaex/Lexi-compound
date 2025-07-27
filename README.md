<div align="center">
    <a href="https://www.cam.ac.uk/">
        <img src="https://www.cam.ac.uk/sites/www.cam.ac.uk/files/inner-images/logo.jpg" width="128px" />
    </a>
    <h1>LEXI: Large Language Models Experimental Interface</h1>
    <p>An innovative platform by <a href="https://cambridge-afar.github.io/">Affective Intelligence and Robotics Laboratory (AFAR)</a> of the University of Cambridge for conducting social interaction experiments with bots and Language Learning & Modeling Systems (LLMS).</p>
</div>

## 🌍 Project Overview

This platform is designed to facilitate advanced research in the field of user-bot interactions and LLMS models. It offers a comprehensive environment for conducting, monitoring, and analyzing experiments in this cutting-edge domain.

## 🎯 Features

### Core Features
- **Multi-Agent Conversations**: Support for single-agent or A/B testing with multiple AI agents
- **Real-time Chat**: Seamless conversation flow with streaming message support
- **User Annotations**: Collect user feedback and reactions during conversations
- **Flexible Forms**: Customizable pre and post-conversation questionnaires
- **Experiment Management**: Comprehensive admin panel for managing experiments and participants
- **Analytics Dashboard**: Real-time insights into conversation metrics and user engagement
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Multiple AI Providers**: Support for OpenAI and DeepSeek APIs

### Advanced Features
- **🎤 Whisper Speech-to-Text**: Real-time audio transcription with support for multiple languages
  - Multiple model sizes (tiny ~39MB, small ~244MB)
  - Auto language detection or manual selection (English/Chinese)
  - Configurable accuracy vs speed trade-offs
  - Secure audio processing with automatic cleanup

- **🤖 PyLips Digital Avatars**: Interactive digital humans with facial expressions and lip-sync
  - Real-time facial animation and lip synchronization
  - Emotion-based expression selection
  - Multiple TTS engines (System TTS, Amazon Polly)
  - Customizable voice settings and languages
  - Non-blocking audio playback

- **🎭 AI Avatar Integration**: Enhanced D-ID digital avatars for premium user experience

## 🚀 Quick Start

To set up and start using the project, follow these steps:

### Step 0: Download the following pre-requirements:

**Core Requirements:**
- Node.JS 16+ - <a href="https://nodejs.org/en">https://nodejs.org/en</a>
- Python 3.8+ - <a href="https://www.python.org/downloads/">https://www.python.org/downloads/</a>
- Git - <a href ="https://git-scm.com/downloads">https://git-scm.com/downloads</a>
- AI API key - Choose one:
  - OpenAI API key - <a href ="https://help.openai.com/en/articles/4936850-where-do-i-find-my-api-key">OpenAI API key info</a>
  - DeepSeek API key - <a href ="https://platform.deepseek.com/api_keys">DeepSeek API key info</a>

**Optional Requirements (for advanced features):**
- FFmpeg - For audio processing (Whisper)
  - Windows: `choco install ffmpeg` or download from [FFmpeg.org](https://ffmpeg.org/download.html)
  - Linux: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
- PyLips dependencies (for digital avatar):
  - Linux: `sudo apt update && sudo apt install espeak-ng ffmpeg libespeak1`

### Step 1: Set Up MongoDB Database

Before setting up the project, you'll need a MongoDB database. You can set this up locally on your machine, or use MongoDB Atlas for a cloud-based solution.

- **Setting up MongoDB Locally:**
  Follow [this guide](https://docs.mongodb.com/manual/installation/) to install MongoDB locally on your system.

- **Setting up MongoDB on Atlas:**
  MongoDB Atlas offers a cloud-based solution. You can set up a free cluster following [this guide](https://docs.atlas.mongodb.com/getting-started/).

  **Make sure you are adding your ip to be white listed**

### Step 2: Clone the Repository

```bash
git clone https://github.com/Tomer-Lavan/Lexi
```

### Step 3: Install Dependencies

- For the client:
  ```bash
  cd client
  npm run setup
  ```

- For the server:
  ```bash
  cd server
  npm run setup
  ```

### Setup Process Details

During the setup process, you'll be guided through a series of prompts to configure your environment:

- **AI Provider Selection**: Choose between OpenAI or DeepSeek as your AI API provider
- `OPENAI_API_KEY` or `DEEPSEEK_API_KEY`: Enter your API key based on your chosen provider
- `MONGODB_USER`: Enter the MongoDB username.
- `MONGODB_PASSWORD`: Enter the password for MongoDB.
- `MONGODB_URL`: Provide the MongoDB URL (mongodb+srv://<cluster-name>.mongodb.net).
- `MONGODB_DB_NAME`: Choose a name for your MongoDB database.

Additionally, the setup script will guide you in creating an administrative user for your system. You'll need to provide a username and password for this user.

### Functions of the Setup Script

The setup script automates several important tasks to get your server up and running:

- **Configures Environment Variables**: 
  - It creates a `.env` file containing essential environment variables like your chosen AI API key, MongoDB credentials, and other necessary configurations.
- **Installs Dependencies**: 
  - Executes `npm install` to install all the necessary npm packages that the server requires to function properly.
- **Builds the Project**: 
  - Runs the build process for your TypeScript code, compiling it and preparing your server for execution.
- **Initializes Admin User**: 
  - Creates an admin user within your system using the credentials you provide, facilitating immediate access to admin-level features.

This comprehensive setup ensures that all necessary components are correctly configured, laying the foundation for a smooth and efficient operation of the server.

### Step 4: Set Up Advanced Features (Optional)

#### 4.1 Whisper Speech-to-Text Setup

Whisper enables real-time speech transcription in conversations.

1. **Create Python Virtual Environment:**
   ```bash
   cd server
   python -m venv whisper_env
   ```

2. **Activate Virtual Environment:**
   ```bash
   # Windows:
   whisper_env\Scripts\activate
   
   # Linux/macOS:
   source whisper_env/bin/activate
   ```

3. **Install Whisper Dependencies:**
   ```bash
   pip install openai-whisper torch torchvision torchaudio
   ```

4. **Download Whisper Models:**
   ```bash
   # Download tiny model (~39MB, fast processing)
   python -c "import whisper; whisper.load_model('tiny')"
   
   # Download small model (~244MB, better accuracy)
   python -c "import whisper; whisper.load_model('small')"
   ```

#### 4.2 PyLips Digital Avatar Setup

PyLips provides interactive digital avatars with facial expressions and lip-sync.

1. **Install PyLips Service Dependencies:**
   ```bash
   cd pylips-service
   pip install -r requirements.txt
   ```

2. **Start PyLips Service:**
   ```bash
   # Windows:
   start.bat
   
   # Linux/macOS:
   chmod +x start.sh
   ./start.sh
   
   # Or manually:
   python pylips_service.py
   ```

   **PyLips service will run on: http://localhost:3001**

### Step 5: Running the Project

1. **Start the Server:**
   ```bash
   cd server
   npm run dev
   ```
   **Server will run on: http://localhost:5000**

2. **Start the Client:**
   ```bash
   cd client
   npm start
   ```
   **Client will run on: http://localhost:3000**

3. **Start PyLips Service (if using digital avatars):**
   ```bash
   cd pylips-service
   python pylips_service.py
   ```
   **PyLips service will run on: http://localhost:3001**

### 🔧 Feature Configuration

#### Whisper Configuration
- Access admin panel at `/admin`
- Navigate to "Whisper" section
- Configure model size (tiny/small)
- Set language preferences (auto/en/zh)
- Adjust transcription settings

#### PyLips Configuration
- Access admin panel at `/admin`
- Navigate to "PyLips" section
- Test voice synthesis
- Configure facial expressions
- Adjust TTS settings

Encountering difficulties with your local environment setup? Consult our [Troubleshooting Guide](TROUBLESHOOTING.md) for assistance in resolving your issues.

## 🌐 Deployment

Interested in deploying LEXI? We provide comprehensive deployment guides:

- **[Main Deployment Guide](DEPLOYMENT.md)** - Core LEXI platform deployment
- **[PyLips Integration Guide](PYLIPS_INTEGRATION_GUIDE.md)** - Digital avatar setup and configuration
- **Whisper Setup** - Speech-to-text configuration (see Step 4.1 above)

### Production Considerations

- **Whisper**: Requires Python 3.8+ and sufficient disk space for models
- **PyLips**: Needs audio system access and may require additional system dependencies
- **Performance**: Consider using GPU acceleration for Whisper in high-traffic environments
- **Security**: Ensure proper firewall configuration for additional service ports (3001 for PyLips)

## 🛠️ Contributing

Interested in contributing? We value your input and contributions! Please read our [Contributing Guidelines](CONTRIBUTION.md) for information on how to get started.

## 🔗 Useful Links

- [Project Homepage](https://www.cam.ac.uk/)
- [Research Paper](#) (Link to related research papers or articles)

## 📄 License

This project is licensed under the [CC BY-NC 4.0 License](LICENSE.md).

## 📞 Contact

For any inquiries or further information, reach out to us at [gl538@cam.ac.uk](mailto:gl538@cam.ac.uk).

## 👍 Show Your Support

Give a ⭐️ if this project helped you! Your support encourages us tremendously.
