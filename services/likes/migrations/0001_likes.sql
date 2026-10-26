CREATE TABLE likes (
    item_id TEXT NOT NULL,
    visitor_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, visitor_hash)
) WITHOUT ROWID;

CREATE TABLE like_counts (
    item_id TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
) WITHOUT ROWID;

CREATE TRIGGER likes_insert AFTER INSERT ON likes BEGIN
    INSERT INTO like_counts (item_id, count) VALUES (NEW.item_id, 1)
    ON CONFLICT (item_id) DO UPDATE SET count = count + 1;
END;

CREATE TRIGGER likes_delete AFTER DELETE ON likes BEGIN
    UPDATE like_counts SET count = count - 1 WHERE item_id = OLD.item_id;
END;
