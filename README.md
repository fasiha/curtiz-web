# Curtiz-Web

[Curtiz-Web](https://fasiha.github.io/curtiz-web) is the browser-based interface to [Curtiz](https://github.com/fasiha/curtiz#readme), my experimental Japanese-language-learning-oriented flashcard app with intelligent quiz scheduling. Use this web app if you want to review your Curtiz Markdown files from your phone, from work or school, etc.

## Setup

Why does a web app need a “Setup” section? Because Curtiz-Web doesn’t handle *creation* of your Curtiz Markdown databases of flashcards: you need to:

1. read the [Curtiz documentation](https://github.com/fasiha/curtiz#readme) and create some Markdown files, and
2. commit them to a Git repo that’s cloneable and pushable from the internet: I’ve tested this with [GitHub Gist](https://gist.github.com).

Wow, that second step might be totally incomprehensible to you. Sorry for using a coder technology (Git) in a flashcard app—I wish there was something else with a value proposition this juicy, but there isn’t. I’ll first explain what you need to do to get set up, and then why.

### Git setup
Once you’ve created a Markdown file or two on your computer that Curtiz can handle (you can start with the [Curtiz Readme](https://raw.githubusercontent.com/fasiha/curtiz/master/README.md)),
1. create a [Gist](https://gist.github.com), which you can think of as just a collection of files. You need a GitHub account, so sign up for one if you don’t have one.
2. Create a [GitHub personal access token](https://github.com/settings/tokens). A token is like a password, but you can create many of them, and you can limit each one’s access. On that website,
  1. click “**Generate new token**”,
  2. enter something like “*testing out Curtiz-Web*” under “**Token Description**”,
  3. check the checkbox next to “**gist**” under “**Scopes**”,
  4. click “**Generate token**”,
  5. and most important, copy the token generated. The website can’t show you this token again, so enter it into your browser’s password manager right away or write it down or something.
3. Use your Gist’s URL, your GitHub username, and the token just generated to log into [Curtiz-Web](https://fasiha.github.io/curtiz-web) to begin learning and reviewing your flashcards.

### Why Git?
All the data you store in the cloud could be stolen, or lost, or be rendered useless any day now. The list of internet companies that have disappeared or reorganized is depressingly long. Memrise, Duolingo, LingQ—the language learning services I’ve used have had been around for some years now but any could evaporate with tomorrow’s morning dew.

As both a user and as a developer, I hate this. I don’t want Curtiz to go down that route. As a user, I’m one server crash or database ransomware away from losing my data. As a developer, it’s insulting that I can’t come up with something more resilient.

Curtiz-Web is a purely client-side web application. When you visit https://fasiha.github.io/curtiz-web, your browser gets a static asset bundle (HTML and JavaScript) that can be served on any web host service, including your Raspberry Pi in your closet. Your flashcard data is stored as readable Markdown files in a Git repo that you can clone on any computer—and you don’t even have to use GitHub to store your Git repo, Curtiz-Web should work with BitBucket, Gitlab, Gogs, Gitea, etc. I’ve only tested on GitHub’s Gist platform, but I’m committed to ensuring it works on all Git hosts including that Raspberry Pi in your closet.

## How it works.
So when you open [Curtiz-Web](https://fasiha.github.io/curtiz-web) and enter (1) your Git URL, (2) a username, and (3) a token, your browser fetches the latest Markdown files. As you review and learn flashcards, your browser updates the Markdown files, and pushes the changes back to the Git server (currently tested only with GitHub Gists).

If you review on another device and come back to an old Curtiz-Web session, just refresh the page and log back in with the data. Curtiz-Web doesn’t yet support automatically fetching the latest changes (help gladly accepted!).

## Coding details
[Isomorphic-git](https://isomorphic-git.org/).

*[Isomorphic-git](https://isomorphic-git.org/)*!

***[Isomorphic-git](https://isomorphic-git.org/) is the bomb.***

Isomorphic-git is the magic ingredient that Curtiz-Web uses to clone, commit, and push repos from the browser. It’s what single-handedly enabled this client-side workflow.

Right now, isomorphic-git can’t handle merge-based pulls, which is why when the Git repo changes behind-the-scenes, Curtiz-Web needs refreshed (to pull down a fresh clone). A simple way to fix this would be to fetch before every commit. We can do it! 💪