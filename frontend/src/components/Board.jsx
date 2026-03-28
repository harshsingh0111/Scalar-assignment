import { useEffect, useState } from "react";
import API from "../services/api";
import List from "./List";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import "../styles/board.css";

const HIDDEN_LISTS_KEY = "hiddenListIds";

export default function Board({ search, filter, onFilterOptionsChange }) {
    const [data, setData] = useState([]);
    const [newList, setNewList] = useState("");
    const [manualCardOrder, setManualCardOrder] = useState(false);

    const getHiddenListIds = () => {
        try {
            const raw = localStorage.getItem(HIDDEN_LISTS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.map((id) => Number(id)) : [];
        } catch {
            return [];
        }
    };

    const saveHiddenListIds = (ids) => {
        localStorage.setItem(HIDDEN_LISTS_KEY, JSON.stringify(ids));
    };

    const fetchData = async () => {
        try {
            const res = await API.get("/boards");
            const lists = Array.isArray(res?.data?.lists) ? res.data.lists : [];
            const hiddenIds = new Set(getHiddenListIds());
            setData(
                lists.map((list) => ({
                    ...list,
                    cards: Array.isArray(list.cards) ? list.cards : [],
                }))
                .filter((list) => !hiddenIds.has(Number(list.id)))
            );
        } catch (error) {
            console.error("Failed to fetch board data:", error);
            setData([]);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setManualCardOrder(false);
    }, [filter]);

    useEffect(() => {
        const labelSet = new Set();
        const employeeSet = new Set();

        data.forEach((list) => {
            const cards = Array.isArray(list.cards) ? list.cards : [];
            cards.forEach((card) => {
                String(card.labels || "")
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .forEach((label) => labelSet.add(label));

                String(card.assignees || "")
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .forEach((employee) => employeeSet.add(employee));
            });
        });

        onFilterOptionsChange?.({
            labels: [...labelSet].sort((a, b) => a.localeCompare(b)),
            employees: [...employeeSet].sort((a, b) => a.localeCompare(b)),
        });
    }, [data, onFilterOptionsChange]);

    const replaceCardInState = (updatedCard) => {
        if (!updatedCard?.id) return;

        setData((prev) =>
            prev.map((list) => {
                const cards = Array.isArray(list.cards) ? list.cards : [];
                const hasCard = cards.some((card) => card.id === updatedCard.id);
                if (!hasCard) return list;

                return {
                    ...list,
                    cards: cards.map((card) =>
                        card.id === updatedCard.id ? { ...card, ...updatedCard } : card
                    ),
                };
            })
        );
    };

    const addCardToListInState = (listId, card) => {
        if (!card?.id) return;
        setData((prev) =>
            prev.map((list) =>
                list.id === listId
                    ? { ...list, cards: [...(Array.isArray(list.cards) ? list.cards : []), card] }
                    : list
            )
        );
    };

    const renameListInState = (listId, title) => {
        setData((prev) =>
            prev.map((list) => (list.id === listId ? { ...list, title } : list))
        );
    };

    const deleteListFromState = async (listId) => {
        const previous = data;
        setData((prev) =>
            prev
                .filter((list) => list.id !== listId)
                .map((list, idx) => ({ ...list, position: idx }))
        );

        try {
            await API.delete(`/lists/${listId}`);
        } catch (error) {
            try {
                await API.post(`/lists/delete/${listId}`);
            } catch (fallbackError) {
                const hidden = getHiddenListIds();
                if (!hidden.includes(Number(listId))) {
                    saveHiddenListIds([...hidden, Number(listId)]);
                }
                console.warn("Backend delete route not found; list hidden locally:", fallbackError);
                setData(
                    previous
                        .filter((list) => list.id !== listId)
                        .map((list, idx) => ({ ...list, position: idx }))
                );
            }
        }
    };

    const extractCardId = (draggableId) => {
        const value = String(draggableId || "");
        const parts = value.split("-");
        return parts[parts.length - 1];
    };

    // ➕ Add List
    const addList = async () => {
        if (!newList.trim()) return;

        await API.post("/lists", {
            title: newList,
            board_id: 1
        });

        setNewList("");
        fetchData();
    };

    // 🔄 Drag & Drop (unchanged, safe)
    const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    // ✅ LIST REORDER
    if (type === "list") {
        const newLists = Array.from(data);
        const [moved] = newLists.splice(source.index, 1);
        newLists.splice(destination.index, 0, moved);

        setData(newLists);

        try {
            await API.put("/lists/reorder", {
                lists: newLists.map((l, index) => ({
                    id: l.id,
                    position: index
                }))
            });
        } catch (err) {
            console.error("List reorder failed:", err);
        }

        return;
    }

    // ✅ CARD REORDER
    const newData = data.map((list) => ({
        ...list,
        cards: [...(list.cards || [])]
    }));

    const sourceList = newData.find(
        (l) => String(l.id) === source.droppableId
    );
    const destList = newData.find(
        (l) => String(l.id) === destination.droppableId
    );

    if (!sourceList || !destList) return;

    const cardId = String(draggableId).split("-").pop();

    const sourceIndex = sourceList.cards.findIndex(
        (c) => String(c.id) === cardId
    );

    if (sourceIndex === -1) return;

    // 🔥 REMOVE CARD
    const [movedCard] = sourceList.cards.splice(sourceIndex, 1);

    // 🔥 INSERT CARD
    destList.cards.splice(destination.index, 0, movedCard);

    // 🔥 UPDATE LIST ID
    movedCard.list_id = destList.id;

    // 🔥 UPDATE UI
    setData(JSON.parse(JSON.stringify(newData)));

    // 🔥 PREPARE BULK UPDATE (MOST IMPORTANT FIX)
    const updatedCards = [];

    newData.forEach((list) => {
        list.cards.forEach((card, index) => {
            updatedCards.push({
                id: card.id,
                list_id: list.id,
                position: index
            });
        });
    });

    // 🔥 BACKEND CALL (FINAL FIX)
    try {
        await API.put("/cards/reorder", {
            cards: updatedCards
        });


    } catch (err) {
        console.error("Card reorder failed:", err);
    }
};

    // 🔥 FINAL DERIVED DATA (SEARCH + SORT — NO MUTATION)
    const processedData = data.map(list => {
        let cards = [...(Array.isArray(list.cards) ? list.cards : [])];
        const selectedLabel = filter.startsWith("label:") ? filter.slice(6) : "";
        const selectedEmployee = filter.startsWith("employee:") ? filter.slice(9) : "";

        // 🔍 SEARCH
        if (search) {
            cards = cards.filter(card =>
                card.title.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (selectedLabel) {
            cards = cards.filter((card) =>
                String(card.labels || "")
                    .split(",")
                    .map((v) => v.trim().toLowerCase())
                    .includes(selectedLabel.toLowerCase())
            );
        }

        if (selectedEmployee) {
            cards = cards.filter((card) =>
                String(card.assignees || "")
                    .split(",")
                    .map((v) => v.trim().toLowerCase())
                    .includes(selectedEmployee.toLowerCase())
            );
        }

        // 🔽 SORT
        if (filter && !manualCardOrder) {
            cards = [...cards].sort((a, b) => {
                if (filter !== "nearest" && filter !== "farthest") return 0;
                if (!a.due_date || !b.due_date) return 0;

                return filter === "nearest"
                    ? new Date(a.due_date) - new Date(b.due_date)
                    : new Date(b.due_date) - new Date(a.due_date);
            });
        }

        return { ...list, cards };
    });

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="list">
                {(provided) => (
                    <div
                        className="board"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {processedData.map((list, index) => (
                            <List
                                key={list.id}
                                list={list}
                                index={index}
                                onCardUpdated={replaceCardInState}
                                onCardCreated={addCardToListInState}
                                onDeleteList={deleteListFromState}
                                onRenameList={renameListInState}
                            />
                        ))}

                        {provided.placeholder}

                        {/* ➕ Add List */}
                        <div className="add-list">
                            <input
                                placeholder="+ Add List"
                                value={newList}
                                onChange={(e) => setNewList(e.target.value)}
                            />
                            <button onClick={addList}>Add</button>
                        </div>
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}
