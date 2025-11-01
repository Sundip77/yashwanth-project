# MediShield AI

MediShield AI is a Vite + React + TypeScript web app using shadcn-ui and Tailwind CSS, with Supabase for auth and data.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/Sundip77/yashwanth-project.git
   cd yashwanth-project
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the project root:
```sh
   cp .env.example .env.local
   ```

   Then edit `.env.local` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
   ```

   **How to find your Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Navigate to **Settings** → **API**
   - Copy the **Project URL** → this is your `VITE_SUPABASE_URL`
   - Copy the **anon public** key → this is your `VITE_SUPABASE_PUBLISHABLE_KEY`

4. **Start the development server**
   ```sh
npm run dev
```

5. **Open your browser**
   - Visit `http://localhost:5173`
   - You should see the sign-in page

## ⚠️ Troubleshooting "Failed to fetch" Error

If you see "Failed to fetch" when trying to sign up or sign in:

### 1. **Verify .env.local file exists and is in the correct location**
   - Must be in the **root** of the project (same folder as `package.json`)
   - File name must be exactly `.env.local` (not `.env` or `env.local`)

### 2. **Check environment variables are set correctly**
   - Open `.env.local` and verify both variables are present
   - No quotes around the values
   - No extra spaces
   - Example:
     ```
     VITE_SUPABASE_URL=https://abc123.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
     ```

### 3. **Restart the development server**
   - **Important:** After creating or modifying `.env.local`, you MUST restart the dev server
   - Stop the server (Ctrl+C)
   - Run `npm run dev` again
   - Vite only loads `.env.local` on startup

### 4. **Verify Supabase URL is correct**
   - Test in browser: Open `https://your-project-ref.supabase.co/status`
   - Should return JSON (not an error page)
   - If you get DNS error, the URL is wrong

### 5. **Check browser console**
   - Open DevTools (F12) → Console tab
   - Look for red error messages
   - Should see warnings if env vars are missing

### 6. **Network/firewall issues**
   - Ensure internet connection is working
   - Try disabling VPN if using one
   - Check if firewall is blocking requests to `*.supabase.co`

### 7. **Verify Supabase project is active**
   - Check Supabase Dashboard
   - Ensure project hasn't been paused or deleted

## 📁 Project Structure

```
medishield-ai-main/
├── src/
│   ├── pages/          # Route pages (Auth, Chat, etc.)
│   ├── components/     # React components
│   ├── integrations/   # Supabase client setup
│   └── ...
├── .env.local          # Your environment variables (not in git)
├── .env.example        # Example env file
└── package.json
```

## 🛠️ Tech Stack

- **Vite** - Build tool and dev server
- **React** - UI framework (TypeScript)
- **shadcn-ui** - Component library
- **Tailwind CSS** - Styling
- **Supabase** - Authentication & Database

## 📝 Notes

- Never commit `.env.local` to git (it's in .gitignore)
- Always restart the dev server after changing `.env.local`
- Use the **anon/public** key, never the service_role key
