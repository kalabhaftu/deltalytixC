# Deltalytix

Deltalytix is a personal trading analytics platform for storing, exploring, and understanding trading track records.

## Features

### 1. User Authentication
- Authentication using Supabase
- Discord login
- User profile management

### 2. Data Import and Processing
- CSV data import
- AI-assisted field mapping
- Support for multiple CSV formats, including Rithmic Performance Import
- Data encryption

### 3. Analytics
- Daily performance charts (PnL, Volume, etc.)
- Trading session summaries
- Decile statistics and trading habits analysis (upcoming)
- AI-powered sentiment analysis (upcoming)

### 4. User Interface
- Responsive design
- Dark mode support
- Customizable dashboard
- Interactive charts and data visualizations

### 5. Data Management
- Secure storage of trading data
- Easy access to historical trading information
- Data visualization tools

## Getting Started

To run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Prisma

## Technical Architecture

### Data Fetching and Caching
- API routes with GET methods are used extensively to leverage Next.js/Vercel's built-in caching capabilities
- Server Actions are employed for mutations and operations that don't require caching or public exposure
- This hybrid approach optimizes performance while maintaining security

### Database Layer
- Prisma is used as the primary ORM for type-safe database operations
- Schema definitions are centralized in Prisma, enabling:
  - Type-safe database queries
  - Easy schema migrations
  - Cross-platform compatibility (e.g., potential Python integration)

### State Management
- Client-side state is managed through stores
- Context is used for complex mutations that require both store updates and database operations
- This architecture could potentially be simplified to use stores exclusively

### Security and Performance
- Sensitive operations are handled through Server Actions to prevent exposure
- Public data is served through cached API routes for optimal performance
- Database operations are type-safe and validated through Prisma


## Cursor usage

You can find cursor rules in the `.cursorrules` file in the root of the project.
Also, to generate commit messages, use :
```
@Commit (Diff of Working State) Take a deep breath and work on this problem step-by-step.
Summarize the provided diff into a clear and concisely written commit message.
Use the imperative style for the subject, 
use Conventional Commits (type and optionally scope), and limit the subject+type+scope to 50 characters or less. 
Be as descriptive as possible in the unlimited length body. 
Return as a single codeblock, ready to be pasted into COMMIT_EDITMSG without further editing
```
# Test commit for new author configuration
