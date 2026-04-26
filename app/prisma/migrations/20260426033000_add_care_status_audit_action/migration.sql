-- Add audit action for care request status transitions.
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'CARE_STATUS_CHANGED';
