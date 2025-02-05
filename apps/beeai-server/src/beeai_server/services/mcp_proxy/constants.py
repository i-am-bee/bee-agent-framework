from enum import StrEnum


class NotificationStreamType(StrEnum):
    BROADCAST = "broadcast"
    """Forward notifications from all providers except those that are private: [ProgressNotification]"""

    PROGRESS = "progress"
    """Forward progress notifications which belong to this request"""
