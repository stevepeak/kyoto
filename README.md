<p align="center">
    <img width="1536" height="1024" alt="Image" src="https://github.com/user-attachments/assets/e7c21c44-27c8-4c0f-a626-73029de6e583" />
</p>

入   |  
京   |  
行   |   Kyoto 
改   |  
善   |  


Kyoto is the **intent testing** platform. 

1. **Write** user stories as tests with `kyoto craft --with-ai`
  - [What is a user story?]()
2. **Test** your user behaviors via `kyoto test`, or ...
  - `kyoto test --only browser` for browser simulation testing
  - `kyoto test --only mobile` for mobile simulation testing
  - `kyoto test --only tui` for terminal/cli simluation testing
  - `kyoto test --only trace` for ai deep-trace testing
3. **Continiously** in GitHub Actions with `kyoto setup github`
4. **Inquire** with "DeepWiki but for user stories" with `kyoto wiki`


## Mission

In the age of AI, many developers are vibe coding and not writing tests. We don't blame them. Instead, let's craft user stories and let AI review the code to ensure the functionality works as expected.

**Kyoto tests intent.** We call this "Intent Testing."

## How It Works

Stories encapsulate the intent of a user behavior or technical workflow within your product. Articulate your story in natural language, then Kyoto will evaluate the intent to ensure the code aligns with your requirements.

Kyoto weaves into your existing checks. Not replacing other tools, but complementing them. While traditional CI tools test code quality, test coverage, and security, Kyoto tests user stories and ensures the code works as expected by reading and understanding the intent of your code.

## Crafted with Intention

Made with intention by the creators of [Codecov](https://codecov.io) - [@iopeak](https://x.com/iopeak)

---

For setup and development instructions, see [SETUP.md](./SETUP.md).
