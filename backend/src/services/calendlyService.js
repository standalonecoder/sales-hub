import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_BASE_URL = 'https://api.calendly.com';

const calendlyClient = axios.create({
  baseURL: CALENDLY_BASE_URL,
  headers: {
    'Authorization': `Bearer ${CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Get current user info (to get organization URI)
export async function getCurrentUser() {
  try {
    const response = await calendlyClient.get('/users/me');
    return response.data.resource;
  } catch (error) {
    console.error('Error fetching Calendly user:', error.response?.data || error.message);
    throw error;
  }
}

// Get organization
export async function getOrganization() {
  try {
    const user = await getCurrentUser();
    const orgUri = user.current_organization;
    
    const response = await calendlyClient.get(orgUri.replace('https://api.calendly.com', ''));
    return response.data.resource;
  } catch (error) {
    console.error('Error fetching organization:', error.response?.data || error.message);
    throw error;
  }
}

// Get all event types for organization
export async function getEventTypes() {
  try {
    const user = await getCurrentUser();
    const response = await calendlyClient.get('/event_types', {
      params: {
        organization: user.current_organization,
        count: 100
      }
    });
    return response.data.collection;
  } catch (error) {
    console.error('Error fetching event types:', error.response?.data || error.message);
    throw error;
  }
}

// Get scheduled events (bookings)
export async function getScheduledEvents(params = {}) {
  try {
    const user = await getCurrentUser();
    const response = await calendlyClient.get('/scheduled_events', {
      params: {
        organization: user.current_organization,
        count: params.count || 100,
        status: params.status || 'active',
        min_start_time: params.min_start_time, // ISO 8601 format
        max_start_time: params.max_start_time
      }
    });
    return response.data.collection;
  } catch (error) {
    console.error('Error fetching scheduled events:', error.response?.data || error.message);
    throw error;
  }
}

// Get event details
export async function getEvent(eventUri) {
  try {
    const response = await calendlyClient.get(eventUri.replace('https://api.calendly.com', ''));
    return response.data.resource;
  } catch (error) {
    console.error('Error fetching event:', error.response?.data || error.message);
    throw error;
  }
}

// Get invitee (who booked the call)
export async function getInvitee(inviteeUri) {
  try {
    const response = await calendlyClient.get(inviteeUri.replace('https://api.calendly.com', ''));
    return response.data.resource;
  } catch (error) {
    console.error('Error fetching invitee:', error.response?.data || error.message);
    throw error;
  }
}

// Get organization members (your team)
export async function getOrganizationMembers() {
  try {
    const user = await getCurrentUser();
    const response = await calendlyClient.get('/organization_memberships', {
      params: {
        organization: user.current_organization,
        count: 100
      }
    });
    return response.data.collection;
  } catch (error) {
    console.error('Error fetching members:', error.response?.data || error.message);
    throw error;
  }
}

// Get user by email
export async function getUserByEmail(email) {
  try {
    console.log(`[Calendly] Searching for user: ${email}`);
    const members = await getOrganizationMembers();
    
    // Find member by email
    const member = members.find(m => m.user?.email?.toLowerCase() === email.toLowerCase());
    
    if (!member) {
      console.log(`[Calendly] User not found: ${email}`);
      return null;
    }
    
    console.log(`[Calendly] ✅ Found user: ${member.user.uri}`);
    return {
      uri: member.user.uri,
      email: member.user.email,
      name: member.user.name,
      role: member.role
    };
  } catch (error) {
    console.error('[Calendly] Error finding user:', error.response?.data || error.message);
    throw error;
  }
}

// Invite user to organization
export async function inviteUser(email, firstName, lastName) {
  try {
    console.log(`[Calendly] Inviting user: ${email}`);
    const user = await getCurrentUser();
    
    const response = await calendlyClient.post('/organization_invitations', {
      email: email,
      organization: user.current_organization
    });
    
    console.log(`[Calendly] ✅ Invitation sent to ${email}`);
    return {
      success: true,
      email: email,
      invitationUri: response.data.resource.uri
    };
  } catch (error) {
    console.error('[Calendly] Error inviting user:', error.response?.data || error.message);
    throw new Error(`Failed to invite Calendly user: ${error.response?.data?.message || error.message}`);
  }
}

// Remove user from organization
export async function removeUser(email) {
  try {
    console.log(`[Calendly] Removing user: ${email}`);
    
    // First, find the user
    const members = await getOrganizationMembers();
    const member = members.find(m => m.user?.email?.toLowerCase() === email.toLowerCase());
    
    if (!member) {
      console.log(`[Calendly] User not found: ${email}`);
      return { success: true, message: 'User not found in Calendly' };
    }
    
    // Remove the organization membership
    const membershipUri = member.uri.replace('https://api.calendly.com', '');
    await calendlyClient.delete(membershipUri);
    
    console.log(`[Calendly] ✅ User removed: ${email}`);
    return {
      success: true,
      message: 'User removed from Calendly'
    };
  } catch (error) {
    console.error('[Calendly] Error removing user:', error.response?.data || error.message);
    throw new Error(`Failed to remove Calendly user: ${error.response?.data?.message || error.message}`);
  }
}