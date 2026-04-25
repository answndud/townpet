-- Add audit action for market listing status transitions.
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'MARKET_STATUS_CHANGED';
