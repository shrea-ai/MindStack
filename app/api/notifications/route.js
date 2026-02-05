// app/api/notifications/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/database'

/**
 * GET /api/notifications
 * Fetch all notifications for the authenticated user
 */
export async function GET(request) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const includeRead = searchParams.get('includeRead') !== 'false'
        const includeDismissed = searchParams.get('includeDismissed') === 'true'
        const category = searchParams.get('category')
        const priority = searchParams.get('priority')

        const supabase = await connectToDatabase()

        // Build query
        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (!includeRead) {
            query = query.eq('read', false)
        }

        if (!includeDismissed) {
            query = query.eq('dismissed', false)
        }

        if (category) {
            query = query.eq('category', category)
        }

        if (priority) {
            query = query.eq('priority', priority)
        }

        const { data: notifications, error } = await query

        if (error) {
            // Check if error is due to missing table (404-like in Supabase context sometimes, provides specific message)
            console.error('Supabase fetch error:', error)
            throw new Error(error.message)
        }

        // Format notifications (snake_case DB -> camelCase app)
        const formattedNotifications = notifications.map(notif => ({
            id: notif.id,
            userId: notif.user_id,
            type: notif.type,
            priority: notif.priority,
            category: notif.category,
            title: notif.title,
            message: notif.message,
            actionLabel: notif.action_label,
            actionUrl: notif.action_url,
            metadata: notif.metadata,
            read: notif.read,
            readAt: notif.read_at,
            dismissed: notif.dismissed,
            dismissedAt: notif.dismissed_at,
            timestamp: notif.created_at,
            createdAt: notif.created_at
        }))

        return NextResponse.json({
            success: true,
            notifications: formattedNotifications,
            count: formattedNotifications.length
        })

    } catch (error) {
        console.error('Get notifications error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch notifications' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/notifications
 * Create a new notification
 */
export async function POST(request) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const data = await request.json()

        const {
            userId,
            type,
            priority,
            category,
            title,
            message,
            actionLabel,
            actionUrl,
            metadata
        } = data

        // Validate required fields
        if (!type || !priority || !category || !title || !message) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Ensure userId matches session
        if (userId && userId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Invalid user ID' },
                { status: 403 }
            )
        }

        const supabase = await connectToDatabase()

        // Create notification object (camelCase input -> snake_case DB)
        const notification = {
            user_id: session.user.id,
            type,
            priority,
            category,
            title,
            message,
            action_label: actionLabel || null,
            action_url: actionUrl || null,
            metadata: metadata || {},
            read: false,
            dismissed: false,
            created_at: new Date().toISOString()
        }

        const { data: newNotification, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single()

        if (error) {
            console.error('Supabase insert error:', error)
            throw new Error(error.message)
        }

        // Format response
        return NextResponse.json({
            success: true,
            notification: {
                id: newNotification.id,
                userId: newNotification.user_id,
                type: newNotification.type,
                priority: newNotification.priority,
                category: newNotification.category,
                title: newNotification.title,
                message: newNotification.message,
                actionLabel: newNotification.action_label,
                actionUrl: newNotification.action_url,
                metadata: newNotification.metadata,
                read: newNotification.read,
                timestamp: newNotification.created_at,
                createdAt: newNotification.created_at
            }
        })

    } catch (error) {
        console.error('Create notification error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create notification' },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/notifications/bulk
 * Bulk update notifications (e.g., mark all as read)
 */
export async function PATCH(request) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { userId, updates } = await request.json()

        if (userId !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Invalid user ID' },
                { status: 403 }
            )
        }

        // Map updates to snake_case
        const dbUpdates = {}
        if (updates.read !== undefined) dbUpdates.read = updates.read
        if (updates.readAt !== undefined) dbUpdates.read_at = updates.readAt
        if (updates.dismissed !== undefined) dbUpdates.dismissed = updates.dismissed
        if (updates.dismissedAt !== undefined) dbUpdates.dismissed_at = updates.dismissedAt

        dbUpdates.updated_at = new Date().toISOString()

        const supabase = await connectToDatabase()

        const { data, error } = await supabase
            .from('notifications')
            .update(dbUpdates)
            .eq('user_id', session.user.id)
            .eq('dismissed', false)
            .select()

        if (error) {
            console.error('Supabase bulk update error:', error)
            throw new Error(error.message)
        }

        return NextResponse.json({
            success: true,
            modifiedCount: data ? data.length : 0
        })

    } catch (error) {
        console.error('Bulk update notifications error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update notifications' },
            { status: 500 }
        )
    }
}
