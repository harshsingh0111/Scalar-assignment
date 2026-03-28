import { Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import API from "../services/api";
import CardModal from "./CardModal";
import "../styles/card.css";

export default function Card({ card, listId, index, onCardUpdated }) {
    const [open, setOpen] = useState(false);
    const isCompleted = Boolean(card.is_completed);

    const toggle = async (e) => {
        e.stopPropagation();
        const res = await API.put(`/cards/toggle/${card.id}`);
        onCardUpdated?.(res.data.card);
    };

    const labels = card.labels ? card.labels.split(",") : [];
    const colors = card.colors ? card.colors.split(",") : [];

    const isLate = card.due_date && new Date(card.due_date) < new Date();

    return (
    <>
        <Draggable draggableId={`card-${card.id}`} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`card ${isCompleted ? "completed" : ""} ${
                        snapshot.isDragging ? "dragging" : ""
                    }`}
                    style={{
    ...provided.draggableProps.style,
    zIndex: snapshot.isDragging ? 9999 : "auto",
}}
                    onClick={() => setOpen(true)}
                >
                    {/* 🔥 DRAG HANDLE (small area) */}
                    <div
    {...provided.dragHandleProps}
    style={{
        cursor: "grab",
        marginBottom: "6px",
        fontSize: "18px",
        opacity: 0.6
    }}
>
    ⋮⋮
</div>

                    <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={toggle}
                        onClick={(e) => e.stopPropagation()}
                    />

                    <div className="labels">
                        {labels.map((label, i) => (
                            <span
                                key={`${card.id}-${label}-${i}`}
                                style={{ background: colors[i] }}
                                className="label"
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    <h4>{card.title}</h4>

                    {card.description && (
                        <p className="desc">{card.description}</p>
                    )}

                    {card.due_date && (
                        <div className={`deadline ${isLate ? "late" : ""}`}>
                            {new Date(card.due_date).toLocaleDateString()}
                        </div>
                    )}
                </div>
            )}
        </Draggable>

        {open && (
            <CardModal
                card={card}
                close={() => setOpen(false)}
                onCardUpdated={onCardUpdated}
            />
        )}
    </>
);
}