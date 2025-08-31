# OSS Contribution Timeline - Portfolio
My portfolio, Your portfolio and Everyone else's portfolio.
Visualize your pull requests as an interactive timeline. This is a portfolio for people who are busy on more important things.

## Demo
Add a GIF or video.

## How it works
- Fork this repo.  
- GitHub Action fetches your PRs and generates a `portfolio.json` with tags according to quantifiable metrics.  
- Open your fork’s deployment URL after deploying → see your contribution story.  

## Customizations  
- You might not like the every comment and every diff it identifies to be shown. Curating your best work to signal your quality is possible by editing .json file yourself. Remove the comment you don't want to appear from `feedback` of that PR. If you don't want anything from a PR which could be from personal account for personal projects, you can simply remove that pr object entirely. Or remove the tags from that PR it will not render under any section.  
- Also you don't have to be worried about the part that you might lose your curation because on every push github action will regenerate `porfolio.json`. It is handled by making sure that it checks the `generated_at` time stamp and adds PR created after that timestamp. This allows past changes untouched and only pushes new PRs in your `portfolio.json`.

## No setup required
Just fork → wait for Action → deploy to GH pages → visit your page.  
