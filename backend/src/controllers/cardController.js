const db = require("../config/db");
const { ensureAssigneeTable } = require("../utils/assignees");

const getCardById = async (cardId) => {
    await ensureAssigneeTable(db);
    const [rows] = await db.query(
        `
        SELECT
            c.*,
            GROUP_CONCAT(DISTINCT l.name ORDER BY l.id SEPARATOR ',') AS labels,
            GROUP_CONCAT(DISTINCT l.color ORDER BY l.id SEPARATOR ',') AS colors,
            GROUP_CONCAT(DISTINCT ca.employee_name ORDER BY ca.employee_name SEPARATOR ',') AS assignees
        FROM cards c
        LEFT JOIN card_labels cl ON c.id = cl.card_id
        LEFT JOIN labels l ON cl.label_id = l.id
        LEFT JOIN card_assignees ca ON c.id = ca.card_id
        WHERE c.id = ?
        GROUP BY c.id
        `,
        [cardId]
    );

    return rows[0] || null;
};

exports.getCardById = getCardById;

exports.createCard = async (req, res) => {
    const { title, list_id } = req.body;

    if (!title || !list_id) {
        return res.status(400).json({ message: "title and list_id are required" });
    }

    const [rows] = await db.query(
        "SELECT COUNT(*) as count FROM cards WHERE list_id=?",
        [list_id]
    );

    const [result] = await db.query(
        "INSERT INTO cards (title, list_id, position, is_completed) VALUES (?, ?, ?, 0)",
        [title, list_id, rows[0].count]
    );

    const card = await getCardById(result.insertId);
    res.json({ card });
};

exports.reorderCards = async (req, res) => {
    const { cards } = req.body;

    if (!Array.isArray(cards)) {
        return res.status(400).json({ message: "cards must be an array" });
    }

    for (let i = 0; i < cards.length; i++) {
        const item = cards[i];
        await db.query(
            "UPDATE cards SET position=?, list_id=? WHERE id=?",
            [item.position, item.list_id, item.id]
        );
    }

    res.send("done");
};

exports.updateCard = async (req, res) => {
    let { due_date } = req.body;

    if (due_date) {
        due_date = new Date(due_date).toISOString().split("T")[0];
    }else{
        due_date=null;
    }
    const { title, description } = req.body;

    await db.query(
        "UPDATE cards SET title=?, description=?, due_date=? WHERE id=?",
        [title, description || null, due_date || null, req.params.id]
    );

    const card = await getCardById(req.params.id);
    res.json({ card });
};

exports.toggleComplete = async (req, res) => {
    await db.query(
        "UPDATE cards SET is_completed = NOT is_completed WHERE id=?",
        [req.params.id]
    );

    const card = await getCardById(req.params.id);
    res.json({ card });
};

exports.deleteCard = async (req, res) => {
    const cardId = Number(req.params.id);
    if (!Number.isInteger(cardId) || cardId <= 0) {
        return res.status(400).json({ message: "Invalid card id" });
    }

    const [rows] = await db.query("SELECT list_id FROM cards WHERE id=?", [cardId]);
    if (!rows.length) {
        return res.status(404).json({ message: "Card not found" });
    }

    const listId = rows[0].list_id;

    await db.query("DELETE FROM card_labels WHERE card_id=?", [cardId]);
    await db.query("DELETE FROM cards WHERE id=?", [cardId]);

    const [remainingCards] = await db.query(
        "SELECT id FROM cards WHERE list_id=? ORDER BY position, id",
        [listId]
    );

    for (let i = 0; i < remainingCards.length; i++) {
        await db.query("UPDATE cards SET position=? WHERE id=?", [i, remainingCards[i].id]);
    }

    res.send("deleted");
};
