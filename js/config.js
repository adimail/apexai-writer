export const modelConfigs = {
  openai: [
    { value: "gpt-4", label: "GPT-4 (Recommended)" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  google: [
    {
      value: "gemini-2.5-pro-preview-06-05",
      label: "Gemini 2.5 Pro (Preview 06-05)",
    },
    {
      value: "gemini-2.5-flash-preview-05-20",
      label: "Gemini 2.5 Flash (Preview 05-20)",
    },
    { value: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS" },
    { value: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    {
      value: "gemini-2.0-flash-preview-image-generation",
      label: "Gemini 2.0 Flash (Image Generation Preview)",
    },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite" },
  ],
};

export const companyInfo = {
  name: "APEXAI",
  url: "https://www.apexai.company/",
  servicesPage: "https://www.apexai.company/services",
  projectsPage: "https://www.apexai.company/projects",
  tagline: "We offer a wide range of services to help you succeed.",
  servicesSummary:
    "Full-Stack Development, Reinforcement Learning, AI/ML Frameworks, MLOps/DevOps, NLP & Vision Models, Data Engineering.",
  detailedServices: [
    {
      id: "full-stack",
      name: "Full-Stack Development",
      tech: "React, Node.js, Next.JS, Flask, FastAPI, Streamlit",
    },
    {
      id: "rl",
      name: "Reinforcement Learning",
      tech: "DQN, PPO, Custom Control Agents",
    },
    {
      id: "ai-ml-frameworks",
      name: "AI/ML Frameworks",
      tech: "TensorFlow, PyTorch, Scikit-learn, OpenCV",
    },
    {
      id: "mlops-devops",
      name: "MLOps/DevOps",
      tech: "Docker, GitHub Actions, MLflow, AWS",
    },
    {
      id: "nlp-vision",
      name: "NLP & Vision Models",
      tech: "Transformers (Hugging Face), CNNs",
    },
    {
      id: "data-engineering",
      name: "Data Engineering",
      tech: "ETL pipelines, Web scraping (Selenium, BeautifulSoup)",
    },
  ],
  serviceCategories: [
    "Custom AI Solutions: Tailored artificial intelligence solutions designed to meet your specific business needs and challenges.",
    "Automation & Data Engineering: Streamline your workflows and transform raw data into actionable insights with our engineering expertise.",
    "MLOps & Deployment Pipelines: End-to-end machine learning operations and deployment solutions for seamless AI integration.",
    "End-to-End Web Applications: Full-stack web applications that combine beautiful interfaces with powerful AI capabilities.",
  ],
  capabilities: [
    "Web Platforms with ML Models",
    "Computer Vision Systems",
    "Web Scrapers",
    "AI Agents",
    "IoT Intelligent Systems",
    "ETL Pipelines",
    "Real-time Data Dashboards",
    "Task Automations",
    "Auto-generated Reports",
    "Data Entry Pipelines",
    "Chatbots",
  ],
  industry: "AI Development & Full-Stack Solutions",
  uniqueValue:
    "We deliver cutting-edge AI and web solutions with a focus on practical application and seamless integration.",
  tone: "Professional, innovative, and client-focused",
  targetAudience:
    "Businesses seeking custom AI solutions, automation, or advanced web applications.",
  brandVoiceKeywords:
    "innovative, expert, reliable, results-driven, custom, integrated",
};

// Situation templates - these will now use the fixed companyInfo
// These templates are primarily for emails, but the system prompt for message sequences
// will instruct the LLM to adapt them.
export const getSituationTemplates = () => ({
  "cold-email": `Write a professional cold email that introduces our ${companyInfo.industry} company, ${companyInfo.name}. Focus on how our services (${companyInfo.servicesSummary}) can benefit the recipient. Keep it concise, personalized, and include a clear call-to-action. Use a ${companyInfo.tone} tone. Mention our website ${companyInfo.url} for more details.`,
  followup: `Write a polite follow-up message. Reference previous communication or a recent interaction. Provide additional value or a new piece of information. Maintain engagement without being pushy. Our company is ${companyInfo.name}. Our tone is ${companyInfo.tone}.`,
  "pitch-agency": `Create an agency pitch for ${companyInfo.name}. Highlight our expertise in services like ${companyInfo.servicesSummary}. Emphasize our unique value proposition: "${companyInfo.uniqueValue}". Tailor the pitch to address common client pain points in our industry. The tone should be ${companyInfo.tone}.`,
  proposal: `Draft a section for a professional proposal for ${companyInfo.name}. This section should clearly articulate how our services (e.g., ${companyInfo.detailedServices.map((s) => s.name).join(", ")}) directly address the client's stated needs and objectives. Focus on benefits and outcomes. Our unique value is: "${companyInfo.uniqueValue}".`,
  "meeting-request": `Write a professional meeting request from ${companyInfo.name}. Clearly state the purpose of the meeting, suggest a brief agenda, and offer flexible timing. Respect the recipient's time. Our tone is ${companyInfo.tone}.`,
  "thank-you": `Compose a genuine thank-you message from ${companyInfo.name}. Express appreciation for a specific action or opportunity (e.g., a meeting, a referral, their business). Reinforce our professional relationship and commitment. The tone should be ${companyInfo.tone}.`,
});
