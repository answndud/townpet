INSERT INTO "LostFoundStatusEvent" ("id", "alertId", "actorId", "fromStatus", "toStatus", "createdAt")
SELECT
  md5('lost-found-initial-status:' || alert."id"),
  alert."id",
  post."authorId",
  NULL,
  alert."status",
  post."createdAt"
FROM "LostFoundAlert" AS alert
JOIN "Post" AS post ON post."id" = alert."postId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "LostFoundStatusEvent" AS event
  WHERE event."alertId" = alert."id"
);
