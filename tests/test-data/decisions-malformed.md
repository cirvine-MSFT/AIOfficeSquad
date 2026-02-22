# Decisions

Some random text that isn't structured.

### This heading has no timestamp
**By:** Nobody
Incomplete decision entry without What/Why.

---

###    : Empty timestamp with colon
**By:** Ghost
**What:** This has an empty timestamp.

---

### 2026-02-22T10:00:00Z:
**By:**
**What:**
**Why:**

---

Not a heading at all but has **By:** SomeAuthor in it
**What:** Orphan metadata not under a ### heading

---

### 2026-invalid-date: Bad date format
**By:** Mac
**What:** The timestamp is not valid ISO 8601.
**Why:** Testing malformed dates.

---

### 2026-02-22T10:00:00Z: Duplicate timestamp
**By:** Dutch
**What:** Same timestamp as another entry.
**Why:** Duplicate test.

---

Regular paragraph text between decisions.

### 2026-02-23T12:00:00Z: Valid entry after garbage
**By:** Blain
**What:** This is actually a valid-looking entry after malformed ones.
**Why:** Parser should still pick this up.
