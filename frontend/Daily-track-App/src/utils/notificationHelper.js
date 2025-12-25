// Notification helper functions for different events
import { AlertCircle, CheckCircle, MessageSquare, UserPlus, Clock } from 'lucide-react';

export const createTaskAssignmentNotification = (taskTitle, assignedByName) => {
    return {
        type: 'task_assigned',
        title: 'New task assigned',
        message: `You have been assigned "${taskTitle}" by ${assignedByName}`,
        icon: AlertCircle,
    };
};

export const createTaskCompletionNotification = (taskTitle, completedByName) => {
    return {
        type: 'task_completed',
        title: 'Task completed',
        message: `${completedByName} marked "${taskTitle}" as completed`,
        icon: CheckCircle,
    };
};

export const createCommentNotification = (taskTitle, commenterName) => {
    return {
        type: 'comment',
        title: 'New comment',
        message: `${commenterName} commented on "${taskTitle}"`,
        icon: MessageSquare,
    };
};

export const createTeamMemberNotification = (memberName) => {
    return {
        type: 'team_member',
        title: 'Team member added',
        message: `${memberName} joined the team`,
        icon: UserPlus,
    };
};

export const createStatusUpdateNotification = (taskTitle, newStatus) => {
    return {
        type: 'status_update',
        title: 'Task status updated',
        message: `"${taskTitle}" status changed to ${newStatus}`,
        icon: AlertCircle,
    };
};

export const createDeadlineNotification = (taskTitle, daysRemaining) => {
    return {
        type: 'deadline_reminder',
        title: 'Deadline reminder',
        message: `"${taskTitle}" is due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
        icon: Clock,
    };
};
