process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const https = require('https');
const app = express();
const PORT = 9876;

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQzNjA3ODI2LCJpYXQiOjE3NDM2MDc1MjYsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjA5ZmVjNDRlLTUyNmItNDNlMy05ODI5LWE4YjI3ZjU5OGEyMiIsInN1YiI6IjIyMDUyODE2QGtpaXQuYWMuaW4ifSwiZW1haWwiOiIyMjA1MjgxNkBraWl0LmFjLmluIiwibmFtZSI6ImhhcnNoIGt1bWFyIiwicm9sbE5vIjoiMjIwNTI4MTYiLCJhY2Nlc3NDb2RlIjoibndwd3JaIiwiY2xpZW50SUQiOiIwOWZlYzQ0ZS01MjZiLTQzZTMtOTgyOS1hOGIyN2Y1OThhMjIiLCJjbGllbnRTZWNyZXQiOiJHWGNYYUhtUVFNVVFGQ2JZIn0.5WH-mnK_9gGojOQJj2Vmf6AvjHlBhAYmFBISBLgBkOo";

async function fetchFromTestServer(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '20.244.56.144',
      path: `/evaluation-service${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 500
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

app.get('/users', async (req, res) => {
  try {
    const usersData = await fetchFromTestServer('/users');
    if (!usersData.users) throw new Error("Invalid response from server");

    const users = Object.entries(usersData.users).map(([id, name]) => ({ id, name }));
    const usersWithPostCounts = await Promise.all(
      users.map(async (user) => {
        try {
          const postsData = await fetchFromTestServer(`/users/${user.id}/posts`);
          return { ...user, postCount: postsData.posts?.length || 0 };
        } catch {
          return { ...user, postCount: 0 };
        }
      })
    );

    const topUsers = usersWithPostCounts.sort((a, b) => b.postCount - a.postCount).slice(0, 5);
    res.json(topUsers);
  } catch (error) {
    console.error('Error in /users:', error);
    res.status(500).json({ error: "Failed to fetch users", details: error.message });
  }
});

app.get('/posts', async (req, res) => {
  try {
    const { type } = req.query;
    if (!['popular', 'latest'].includes(type)) {
      return res.status(400).json({ error: "Invalid type parameter", validTypes: ["popular", "latest"] });
    }

    const usersData = await fetchFromTestServer('/users');
    const userIds = Object.keys(usersData.users);
    const allPosts = (await Promise.all(
      userIds.map(async userId => {
        try {
          const postsData = await fetchFromTestServer(`/users/${userId}/posts`);
          return postsData.posts.map(post => ({ ...post, userId }));
        } catch {
          return [];
        }
      })
    )).flat();

    if (type === 'latest') {
      return res.json(allPosts.sort((a, b) => b.id - a.id).slice(0, 5));
    }

    const postsWithComments = await Promise.all(
      allPosts.map(async post => {
        try {
          const commentsData = await fetchFromTestServer(`/posts/${post.id}/comments`);
          return { ...post, commentCount: commentsData.comments?.length || 0 };
        } catch {
          return { ...post, commentCount: 0 };
        }
      })
    );

    const maxComments = Math.max(...postsWithComments.map(p => p.commentCount));
    res.json(postsWithComments.filter(p => p.commentCount === maxComments));
  } catch (error) {
    console.error('Error in /posts:', error);
    res.status(500).json({ error: "Failed to fetch posts", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});