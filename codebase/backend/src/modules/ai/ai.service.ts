import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private openaiApiKey: string | undefined;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('OPENAI_API_KEY');
    if (key && key !== 'mock-key-for-now') {
      this.openaiApiKey = key;
    }
  }

  async generateCaption(
    topic: string,
    tone: string,
    platform: string,
  ): Promise<{ caption: string }> {
    if (!this.openaiApiKey) {
      return {
        caption: this.generateMockCaption(topic, tone, platform),
      };
    }

    try {
      const prompt = `Write a social media post about "${topic}" in a ${tone} tone optimized for ${platform}. Do not include quotes.`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new BadRequestException('OpenAI API returned an error');
      }

      const data = await response.json();
      return {
        caption: data.choices[0].message.content.trim(),
      };
    } catch {
      // Graceful fallback to mock response if OpenAI API fails or rate-limits
      return {
        caption: this.generateMockCaption(topic, tone, platform),
      };
    }
  }

  async generateHashtags(
    topic: string,
    industry?: string,
  ): Promise<{ hashtags: string[] }> {
    if (!this.openaiApiKey) {
      return {
        hashtags: this.generateMockHashtags(topic, industry),
      };
    }

    try {
      const prompt = `Generate a list of 10 trending hashtags about "${topic}"${
        industry ? ` in the ${industry} industry` : ''
      }. Return only a comma-separated list of tags without hash symbols.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        throw new BadRequestException('OpenAI API returned an error');
      }

      const data = await response.json();
      const text = data.choices[0].message.content.trim();
      const hashtags = text
        .split(',')
        .map((tag: string) => tag.replace(/#/g, '').trim())
        .filter(Boolean);

      return { hashtags };
    } catch {
      return {
        hashtags: this.generateMockHashtags(topic, industry),
      };
    }
  }

  private generateMockCaption(topic: string, tone: string, platform: string): string {
    const isTwitter = platform.toLowerCase() === 'twitter' || platform.toLowerCase() === 'x';
    
    const responses: Record<string, string[]> = {
      professional: [
        `Highly excited to announce our progress on ${topic}! 🚀\n\nInnovation is driven by focus, team dedication, and solving critical customer pain points. Building tools that streamline these operations empowers businesses to scale dynamically.\n\nHow is your team addressing modern scalability challenges this quarter? Let's discuss.`,
        `Effective execution requires aligning resources with strategic initiatives. Today, we're sharing key insights on how modern engineering practices elevate our development on ${topic}.\n\nRead our thoughts and let's explore new paradigms in SaaS delivery.`
      ],
      casual: [
        `Checking in with a quick update on ${topic}! 👋 We've been working on some cool updates behind the scenes and can't wait to share the final results soon. Stay tuned!\n\nWhat are you all working on today?`,
        `Nothing beats the feeling of compiling clean code. Currently heads down polishing the final details for ${topic}. 💻 Let us know what features you want to see next!`
      ],
      educational: [
        `Did you know? Understanding the architectural limits of ${topic} is key to avoiding production bottlenecks.\n\nHere are 3 core pillars to keep in mind:\n1. Keep state close to execution.\n2. Optimize asynchronous execution cycles.\n3. Validate payload boundaries early.\n\nSave this post for your next system architectural review! 💡`,
        `Quick tutorial time! 💡 When implementing ${topic}, developers often run into performance degradation. You can solve this by caching common query paths and rate-limiting dynamic API pipelines. Try it out!`
      ],
      funny: [
        `Me: I will write a simple, elegant script for ${topic} in 15 minutes.\n\n*4 hours later, surrounded by 27 open StackOverflow tabs and an empty coffee pot*\n\nIt compiled! Success is real. 😂`,
        `They said "let's build ${topic}, it will be a simple walk in the park". The park was full of dinosaur-sized merge conflicts and quicksand bugs. Glad to report we survived! 🦖`
      ],
      promotional: [
        `Tired of spending hours managing ${topic}? ContentPilot AI is here to help! 🚀\n\nOur platform automates captions, suggests hashtags, and publishes across multiple networks natively from a single, beautiful dashboard.\n\nGet started for free today at http://localhost:3000!`,
        `Unlock 10x social productivity! 💥 Say goodbye to manual scheduling loops. Our new ${topic} module schedules, tracks, and auto-publishes campaigns seamlessly.\n\nTry it now for free!`
      ]
    };

    const toneKey = tone.toLowerCase();
    const candidateList = responses[toneKey] || responses.professional;
    const rawCaption = candidateList[Math.floor(Math.random() * candidateList.length)];

    if (isTwitter) {
      // Trim to Twitter length limits
      const cleanTweet = rawCaption.split('\n\n')[0];
      return cleanTweet.length > 270 ? `${cleanTweet.substring(0, 267)}...` : cleanTweet;
    }

    return rawCaption;
  }

  private generateMockHashtags(topic: string, industry?: string): string[] {
    const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanInd = industry ? industry.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    
    const defaults = ['socialmedia', 'digitalmarketing', 'automation', 'productivity', 'saas', 'growth'];
    if (cleanTopic) defaults.unshift(cleanTopic);
    if (cleanInd) defaults.push(cleanInd);

    return Array.from(new Set(defaults)).slice(0, 8);
  }
}
