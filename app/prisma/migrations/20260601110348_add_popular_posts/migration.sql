-- Add persistent popular-post promotion state.
ALTER TABLE "Post"
ADD COLUMN "isPopular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "popularPromotedAt" TIMESTAMP(3);

CREATE INDEX "Post_scope_status_popular_order_idx"
ON "Post"("scope", "status", "isPopular", "popularPromotedAt" DESC, "id" DESC);
