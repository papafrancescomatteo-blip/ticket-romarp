-- Bot Ticket Server Secondari Roma RP: whitelist area staff + default italiano
ALTER TABLE "guilds" ALTER COLUMN "locale" SET DEFAULT 'it';
ALTER TABLE "guilds" ALTER COLUMN "footer" SET DEFAULT 'Bot Ticket Server Secondari Roma RP';

CREATE TABLE "staff_access" (
    "id" VARCHAR(19) NOT NULL,
    "note" VARCHAR(100),
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "addedBy" VARCHAR(19),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_access_pkey" PRIMARY KEY ("id")
);
