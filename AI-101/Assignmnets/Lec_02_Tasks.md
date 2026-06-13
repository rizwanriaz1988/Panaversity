## Task 1 — Lab Document Practice & Prompting Report

### What I Learned from the Lab

I learned that AI gives better answers when you explain clearly what you want. Adding context, examples, and clear instructions helps it give accurate and useful answers. It is important to know that AI only knows what you tell it and may guess if the information is recent or private. Giving feedback helps improve answers.

### How My Prompting Improved During the Process

At first, I gave short and general questions, so the answers were not very useful. Later, I started giving more details like purpose, audience, format, and level of detail. I also asked for specific outputs like lists or tables and gave feedback, which made the AI’s answers more accurate.

### Which Prompting Techniques or Approaches Helped Me the Most

The most helpful techniques were giving clear context, telling AI exactly what format I wanted, asking for options, and giving feedback. Using action words like “compare” or “list” helped the AI give balanced answers. Starting a new chat for a new topic also kept answers focused.

### Challenges I Faced and How I Solved Them

Sometimes the AI gave answers that were too long, general, or not correct. I solved this by giving clear instructions, setting limits, and giving feedback. For questions about new or private information, I asked the AI to search or admit it did not know. I also learned to use neutral wording to get fair answers.



## Task 2 — AI Generated Snake Game

### Deployed Game/Application Link

https://snake-game-webapp-liart.vercel.app/

Prompt Iterations Used During Development

Many prompts were used step by step to improve the Snake Game. The first prompt asked for a complete game with keyboard controls, mobile controls, score, difficulty levels, sound, themes, and Vercel support. Later prompts added an immersive design, AI rival snakes, speed settings, bigger snakes eating smaller snakes, rival respawning, safe tail collisions, mobile joystick controls, boundary wrap-around, and head-first eating rules. Bug-fixing prompts were also used when fruits stopped appearing or when earlier rules were accidentally changed.

### What Worked Well

The best part was giving clear feedback after testing each version of the game. Adding one feature at a time helped improve the game without rebuilding everything. Direct prompts like reporting the fruit bug or asking for a joystick made it easier to fix exact problems. The AI also built the project after each major change, which helped check that the application still worked correctly. Clear rules about snake size, head collisions, mobile controls, and boundary movement produced better results.

### What Did Not Work

Some prompts were too general or unclear, so the AI misunderstood the required behaviour. For example, saying that a bigger snake could eat a smaller snake did not clearly explain that the head must be touched first. The AI also sometimes forgot earlier instructions after adding new features, such as safe boundary movement or head-first eating. The phrase “multiple players” could also mean real online players, but the game used AI-controlled rivals instead. These problems caused repeated corrections and extra prompts.

### How Prompts Were Improved Over Time

The prompts became more detailed and specific as development continued. Instead of only saying that snakes should eat each other, later prompts explained that only a bigger snake could eat a smaller snake during a head-to-head collision. The prompts also clearly stated that touching another snake’s body or tail should not end the game, crossing the boundary should move the snake to the opposite side, and mobile devices should have a joystick. Each new prompt corrected unclear rules and reminded the AI to keep earlier features working.

### Challenges Faced During the Process

The main challenge was managing many connected game rules at the same time. The game had to control the player, AI rivals, food, scores, collisions, respawning, mobile controls, and boundary movement without breaking earlier features. Another challenge was that new updates sometimes changed or removed previous instructions. For example, adding mobile controls or boundary wrapping affected other parts of the game logic. These challenges were solved by testing the game repeatedly, reporting exact problems, giving clearer prompts, and rebuilding the application after every important change.



## Task 3 — Lecture Slide Generation Using LLMs

### Slides Link

https://docs.google.com/presentation/d/1yyz1XIne5oA0xRKDqeuIYI_G2E0QQEx_/edit?usp=sharing&ouid=111687963112782378446&rtpof=true&sd=true

### What prompts were used

Initially, simple prompts like “Transcribe this YouTube video,” “Convert this transcript to English,” and “Generate slides covering the lecture topics” were used. The ultimate solution that worked best was to copy the transcript directly from YouTube and then make notes from it. Later, a detailed prompt instructed the AI to study the full lecture, extract main concepts, prepare a structured summary, and create 12–18 slides with speaker notes, visuals, and a completeness checklist.

### Which prompts worked effectively

The most effective prompts were those that clearly defined the full scope, especially the step of copying the YouTube transcript and creating notes from it. These instructions prevented incomplete outputs, ensured the AI analysed the complete lecture, and allowed it to generate structured summaries and well-organised slides with visuals and speaker notes.

### Which prompts did not work well

Short and vague prompts like “Transcribe this” or “Make slides” were ineffective because they lacked instructions on scope, language, depth, and formatting, often resulting in slides based only on the video title or partial transcript.

### How the prompts were refined

Prompts were refined by specifying the exact workflow: first copy the transcript from YouTube, then make detailed notes, analyse the lecture, create a summary, and finally produce slides with concise bullet points, speaker notes, visuals, and a consistent colour theme. Instructions also clarified the need to preserve the logical order of topics and ensure all major content was included.

The complete process followed to achieve the final result

The process began by copying the full YouTube transcript, translating and cleaning it, and then making structured notes from it. These notes were used to identify main topics, definitions, examples, and key lessons. A detailed lecture summary was prepared, followed by slide creation with clear headings, concise bullets, speaker notes, and visual suggestions. The final presentation was checked against the transcript to ensure completeness and logical flow.

### Which AI tools/models were used

ChatGPT was the primary AI tool used for analysing the transcript, summarising lecture content, and generating the slides. YouTube provided the transcript, and presentation slides were made by ChatGPT.