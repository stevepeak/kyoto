let's create the kyoto craft cli command. this is an agent flow that will help guide the user to create a new user story.

it's a prompting call/response. so

京 Hey <git config user.name ?? friend>, let's craft a user story together.
京 A user story describes how a user can interact with your app. Think of it as a simple markdown file describing a single user behavior.
京 (explore the repository for sample storie ideas) Some ideas could be how a user can login with GitHub or how a user can toggle the theme of the site.
京 Would you like to draft one of these stories? (Y/n)
京 Describe your story in natural language and I'll help you craft a markdown file we can test.

> ... user inputs text
> 京 Got it, how does this story sound

| <markdown>
| ....

京 Now that we have a story we can test it.
