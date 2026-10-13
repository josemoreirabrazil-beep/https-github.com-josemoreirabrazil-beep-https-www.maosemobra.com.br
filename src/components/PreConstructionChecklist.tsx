import React, { useState } from 'react';
import { Check, Plus, X, Pencil, Trash2, Bot } from 'lucide-react';
import type { ChecklistItem } from '../types';

interface PreConstructionChecklistProps {
  checklist: ChecklistItem[];
  onUpdate: (checklist: ChecklistItem[]) => void;
}

export const PreConstructionChecklist: React.FC<PreConstructionChecklistProps> = ({ checklist, onUpdate }) => {
  const [newTask, setNewTask] = useState('');

  const toggleTask = (id: string) => {
    onUpdate(checklist.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const item: ChecklistItem = {
      id: Date.now().toString(),
      text: newTask,
      done: false
    };
    onUpdate([...checklist, item]);
    setNewTask('');
  };

  const deleteTask = (id: string) => {
    onUpdate(checklist.filter(item => item.id !== id));
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Bot className="w-5 h-5 text-amber-500" />
        Checklist Pré-Obra
      </h3>
      
      <div className="space-y-2 mb-4">
        {checklist.map(item => (
          <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
            <button 
              onClick={() => toggleTask(item.id)}
              className={`w-6 h-6 rounded-md flex items-center justify-center border ${item.done ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}
            >
              {item.done && <Check className="w-4 h-4" />}
            </button>
            <span className={`flex-1 ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
            <button onClick={() => deleteTask(item.id)} className="text-slate-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input 
          type="text" 
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Nova tarefa..."
          className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
        />
        <button onClick={addTask} className="p-2 bg-slate-900 text-white rounded-lg">
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
