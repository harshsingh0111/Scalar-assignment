import { Droppable, Draggable } from "@hello-pangea/dnd";
import Card from "./Card";
import API from "../services/api";
import { useState } from "react";
import "../styles/list.css";

export default function List({
    list,
    index,
    onCardUpdated,
    onCardCreated,
    onDeleteList,
    onRenameList
}) {
    const [title, setTitle] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameTitle, setRenameTitle] = useState(list.title || "");

    const cards = Array.isArray(list.cards) ? list.cards : [];

    const addCard = async () => {
        if (!title.trim()) return;

        const res = await API.post("/cards", {
            title: title.trim(),
            list_id: list.id
        });

        onCardCreated?.(list.id, res.data.card);
        setTitle("");
    };

    const saveRename = async () => {
        const nextTitle = renameTitle.trim();
        if (!nextTitle) return;

        try {
            await API.put(`/lists/${list.id}`, { title: nextTitle });
        } catch {
            await API.post(`/lists/update/${list.id}`, { title: nextTitle });
        }

        onRenameList?.(list.id, nextTitle);
        setIsRenaming(false);
    };

    return (
        <Draggable draggableId={`list-${list.id}`} index={index}>
            {(provided) => (
                <div
                    className="list"
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={provided.draggableProps.style} 
                >
                    {/* 🔥 FULL HEADER DRAG HANDLE */}
                    <div className="list-header" {...provided.dragHandleProps}>
                        {isRenaming ? (
                            <input
                                className="rename-input"
                                value={renameTitle}
                                onChange={(e) => setRenameTitle(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <h3>{list.title}</h3>
                        )}

                        <div className="list-header-actions">
                            {isRenaming ? (
                                <>
                                    <button
                                        type="button"
                                        className="rename-list-btn"
                                        onClick={saveRename}
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        className="rename-list-btn"
                                        onClick={() => {
                                            setRenameTitle(list.title || "");
                                            setIsRenaming(false);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="rename-list-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameTitle(list.title || "");
                                        setIsRenaming(true);
                                    }}
                                >
                                    Rename
                                </button>
                            )}

                            <button
                                type="button"
                                className="delete-list-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteList?.(list.id);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>

                    {/* 🔥 CARDS */}
                    <Droppable droppableId={String(list.id)} type="card">
                        {(provided, snapshot) => (
                            <div className={`list-cards ${snapshot.isDraggingOver ? "drag-over" : ""}`}>
                                {cards.map((card, i) => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        listId={list.id}
                                        index={i}
                                        onCardUpdated={onCardUpdated}
                                    />
                                ))}

                                {provided.placeholder} {/* 🔥 MUST */}
                            </div>
                        )}
                    </Droppable>

                    {/* ➕ ADD CARD */}
                    <input
                        placeholder="+ Add card"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <button onClick={addCard}>Add</button>
                </div>
            )}
        </Draggable>
    );
}