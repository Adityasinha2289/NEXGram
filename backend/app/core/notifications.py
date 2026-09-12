"""Outbound message delivery.

Sending an SMS costs money per message, and README section 10 puts paid SMS
providers outside the MVP. Rather than pretend, delivery is a small interface
with a console channel wired in by default: the whole password-reset flow -
hashing, expiry, single use, rate limiting, audit - is real, and only the last
hop is stubbed.

Swapping in a provider means writing one class and setting NOTIFICATION_CHANNEL.
Nothing else changes.
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger("nexgram.notifications")


class NotificationChannel(ABC):
    """Delivers a short message to a mobile number."""

    @abstractmethod
    def send(self, mobile: str, message: str, purpose: str) -> bool:
        """Returns whether delivery was accepted. Must not raise."""


class ConsoleChannel(NotificationChannel):
    """Writes to the application log instead of sending.

    The default. In development this is what you read the reset code from; in
    production it is a loud signal that no real provider is configured.
    """

    def send(self, mobile: str, message: str, purpose: str) -> bool:
        # The last four digits are enough to confirm the right number without
        # writing a full phone number into the logs.
        masked = f"******{mobile[-4:]}" if mobile and len(mobile) >= 4 else "******"
        logger.warning(
            "[NO SMS PROVIDER CONFIGURED] %s for %s: %s", purpose, masked, message
        )
        return True


class NullChannel(NotificationChannel):
    """Drops everything. For tests that must not produce log noise."""

    def send(self, mobile: str, message: str, purpose: str) -> bool:
        return True


_channel: NotificationChannel = ConsoleChannel()


def set_channel(channel: NotificationChannel) -> None:
    global _channel
    _channel = channel


def send(mobile: str, message: str, purpose: str) -> bool:
    """Delivers via the configured channel, never raising.

    A failed notification must not fail the request that triggered it: the reset
    token is already stored, and the user can ask again.
    """
    try:
        return _channel.send(mobile, message, purpose)
    except Exception:
        logger.exception("Notification delivery failed for %s", purpose)
        return False


def channel_name() -> str:
    return type(_channel).__name__
