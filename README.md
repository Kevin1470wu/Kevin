# SumStack: Math Puzzle

A challenging math-based block elimination game built with React, Tailwind CSS, and Gemini AI.

## Features
- **Classic Mode**: Survival challenge where rows are added after every success.
- **Time Mode**: Beat the clock to prevent new rows from appearing.
- **AI Tips**: Real-time encouraging tips and math facts powered by Gemini AI.
- **Responsive Design**: Playable on both mobile and desktop.

## Deployment to Vercel

1. **Push to GitHub**:
   - Create a new repository on GitHub.
   - Initialize git in your local project:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin <your-github-repo-url>
     git push -u origin main
     ```

2. **Deploy on Vercel**:
   - Go to [Vercel](https://vercel.com) and click "Add New" -> "Project".
   - Import your GitHub repository.
   - In the **Environment Variables** section, add:
     - `GEMINI_API_KEY`: Your Google Gemini API Key (get it from [Google AI Studio](https://aistudio.google.com/app/apikey)).
   - Click **Deploy**.

## Local Development

```bash
npm install
npm run dev
```
