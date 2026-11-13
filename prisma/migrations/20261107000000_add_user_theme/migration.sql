-- Personal theme: nullable, so every existing user keeps the default look.
ALTER TABLE "User" ADD COLUMN "themeMain" TEXT,
ADD COLUMN "themeAccent" TEXT,
ADD COLUMN "themeFont" TEXT;
