import { useEffect, useState } from "react";
import API from "../services/api";
import List from "./List";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import "../styles/board.css";

export default function Board({ search, filter, onFilterOptionsChange }) {
    const [data, setData] = useState([]);
    const [newList, setNewList] = useState("");
    const [manualCardOrder, setManualCardOrder] = useState(false);

    const fetchData = async () => {
        try {
            const res = await API.get("/boards");
            const lists = Array.isArray(res?.data?.lists) ? res.data.lists : [];
            setData(
                lists.map((list) => ({
                    ...list,
                    cards: Array.isArray(list.cards) ? list.cards : [],
                }))
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

    // ➕ Add List
    const addList = async () => {
        if (!newList.trim()) return;

        await API.post("/lists", {
            title: newList,
            board_id: 1,
        });

        setNewList("");
        fetchData();
    };

    // 🔄 Drag & Drop
    const handleDragEnd = async (result) => {
        if (!result.destination) return;

        const { source, destination, draggableId, type } = result;

        setManualCardOrder(true);

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
                        position: index,
                    })),
                });
            } catch (err) {
                console.error("List reorder failed:", err);
            }

            return;
        }

        // ✅ CARD REORDER
        const newData = data.map((list) => ({
            ...list,
            cards: [...(list.cards || [])],
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

        const [movedCard] = sourceList.cards.splice(sourceIndex, 1);
        destList.cards.splice(destination.index, 0, movedCard);
        movedCard.list_id = destList.id;

        setData(newData);

        // 🔥 BULK UPDATE
        const updatedCards = [];

        newData.forEach((list) => {
            list.cards.forEach((card, index) => {
                updatedCards.push({
                    id: card.id,
                    list_id: list.id,
                    position: index,
                });
            });
        });

        try {
            await API.put("/cards/reorder", {
                cards: updatedCards,
            });
        } catch (err) {
            console.error("Card reorder failed:", err);
        }
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="list">
                {(provided) => (
                    <div
                        className="board"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {data.map((list, index) => {
                            const filteredCards = (list.cards || []).filter((card) => {
                                if (search && !card.title.toLowerCase().includes(search.toLowerCase()))
                                    return false;

                                const selectedLabel = filter.startsWith("label:")
                                    ? filter.slice(6)
                                    : "";
                                const selectedEmployee = filter.startsWith("employee:")
                                    ? filter.slice(9)
                                    : "";

                                if (selectedLabel) {
                                    const labels = String(card.labels || "").toLowerCase();
                                    if (!labels.includes(selectedLabel.toLowerCase())) return false;
                                }

                                if (selectedEmployee) {
                                    const assignees = String(card.assignees || "").toLowerCase();
                                    if (!assignees.includes(selectedEmployee.toLowerCase())) return false;
                                }

                                return true;
                            });

                            return (
                                <List
    key={list.id}
    list={{ ...list, cards: filteredCards }}
    index={index}

    // ✅ FIX 1: Update card instantly
    onCardCreated={(listId, newCard) => {
        setData(prev =>
            prev.map(l =>
                l.id === listId
                    ? { ...l, cards: [...l.cards, newCard] }
                    : l
            )
        );
    }}

    // ✅ FIX 2: Update card toggle/edit instantly
    onCardUpdated={(updatedCard) => {
        setData(prev =>
            prev.map(l => ({
                ...l,
                cards: l.cards.map(c =>
                    c.id === updatedCard.id ? updatedCard : c
                )
            }))
        );
    }}

    // ✅ FIX 3: Delete list instantly
    onDeleteList={async (listId) => {
        try {
            await API.delete(`/lists/${listId}`);
        } catch {
            await API.post(`/lists/delete/${listId}`);
        }

        setData(prev => prev.filter(l => l.id !== listId));
    }}

    // ✅ FIX 4: Rename instantly
    onRenameList={(listId, newTitle) => {
        setData(prev =>
            prev.map(l =>
                l.id === listId ? { ...l, title: newTitle } : l
            )
        );
    }}
/>
                            );
                        })}

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