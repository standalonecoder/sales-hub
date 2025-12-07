import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class ZoomService {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.baseURL = 'https://api.zoom.us/v2';
    this.tokenCache = null;
    this.tokenExpiry = null;
  }

  // Get OAuth access token (Server-to-Server OAuth)
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.tokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.tokenCache;
      }

      console.log('[Zoom] Fetching new access token...');
      
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        null,
        {
          params: {
            grant_type: 'account_credentials',
            account_id: this.accountId
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret
          }
        }
      );

      this.tokenCache = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1min before expiry

      console.log('[Zoom] ✅ Access token obtained');
      return this.tokenCache;
    } catch (error) {
      console.error('[Zoom] Error getting access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom');
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      console.log(`[Zoom] Fetching user by email: ${email}`);
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/users/${email}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log(`[Zoom] ✅ Found user: ${response.data.id}`);
      return {
        id: response.data.id,
        email: response.data.email,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        type: response.data.type,
        status: response.data.status
      };
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`[Zoom] User not found: ${email}`);
        return null;
      }
      console.error('[Zoom] Error fetching user:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Zoom user: ${error.message}`);
    }
  }

  // Create a new Zoom user
  async createUser(firstName, lastName, email) {
    try {
      console.log(`[Zoom] Creating user: ${email}`);
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseURL}/users`,
        {
          action: 'create',
          user_info: {
            email: email,
            type: 2, // Licensed user
            first_name: firstName,
            last_name: lastName
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`[Zoom] ✅ User created: ${response.data.id}`);
      
      return {
        success: true,
        userId: response.data.id,
        email: response.data.email
      };
    } catch (error) {
      console.error('[Zoom] Error creating user:', error.response?.data || error.message);
      throw new Error(`Failed to create Zoom user: ${error.response?.data?.message || error.message}`);
    }
  }

  // Delete Zoom user permanently
  async deleteUser(userIdOrEmail, action = 'delete') {
    try {
      console.log(`[Zoom] Deleting user: ${userIdOrEmail} (action: ${action})`);
      const token = await this.getAccessToken();
      
      await axios.delete(
        `${this.baseURL}/users/${userIdOrEmail}`,
        {
          params: { action: action },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log(`[Zoom] ✅ User deleted successfully`);
      
      return {
        success: true,
        message: 'User deleted from Zoom'
      };
    } catch (error) {
      console.error('[Zoom] Error deleting user:', error.response?.data || error.message);
      throw new Error(`Failed to delete Zoom user: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get user details by ID
  async getUser(userId) {
    try {
      console.log(`[Zoom] Fetching user: ${userId}`);
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        success: true,
        userId: response.data.id,
        email: response.data.email,
        status: response.data.status
      };
    } catch (error) {
      console.error('[Zoom] Error getting user:', error.response?.data || error.message);
      throw new Error(`Failed to get Zoom user: ${error.message}`);
    }
  }
}

export default new ZoomService();