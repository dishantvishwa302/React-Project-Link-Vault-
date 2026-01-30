import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const API_URL = "http://localhost:5000/api";

const App = () => {
  const [view, setView] = useState<'home' | 'create' | 'access' | 'result' | 'manage'>('home');
  
  // --- Create State ---
  const [createType, setCreateType] = useState<'text' | 'file'>('text');
  const [secretText, setSecretText] = useState('');
  const [secretFile, setSecretFile] = useState<File | null>(null);
  const [secretPass, setSecretPass] = useState('');
  const [maxViews, setMaxViews] = useState(1);
  const [expiration, setExpiration] = useState(60); // minutes
  
  // --- Result State ---
  const [createdData, setCreatedData] = useState<{id: string, deleteToken: string, expiresAt: string} | null>(null);

  // --- Access State ---
  const [accessId, setAccessId] = useState('');
  const [accessPass, setAccessPass] = useState('');
  const [retrievedData, setRetrievedData] = useState<any>(null);

  // --- Manage/Delete State ---
  const [deleteId, setDeleteId] = useState('');
  const [deleteToken, setDeleteToken] = useState('');

  // --- Common ---
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Handlers ---

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('type', createType);
      formData.append('password', secretPass);
      formData.append('maxViews', maxViews.toString());
      formData.append('expirationMinutes', expiration.toString());

      if (createType === 'text') {
        formData.append('text', secretText);
      } else if (secretFile) {
        formData.append('file', secretFile);
      } else {
        throw new Error("Please select a file.");
      }

      const res = await fetch(`${API_URL}/secrets`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create');

      setCreatedData(data);
      setView('result');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to server. Is Backend running on 5000?');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrieve = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/secrets/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accessId, password: accessPass })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to retrieve');

      setRetrievedData(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/secrets/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId, deleteToken: deleteToken })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete');

      setSuccessMsg('Secret and File deleted successfully.');
      setDeleteId('');
      setDeleteToken('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Renderers ---

  const renderHome = () => (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg text-center">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Cloud Secret Share</h1>
      <p className="mb-8 text-gray-500 text-sm">Securely share text or files via Cloud Storage.</p>
      
      <div className="grid grid-cols-1 gap-4">
        <button onClick={() => setView('create')} className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm flex items-center justify-center gap-2">
          <span>+</span> Create New Secret
        </button>
        <div className="flex gap-4">
            <button onClick={() => setView('access')} className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-lg hover:bg-gray-200 transition font-medium border border-gray-200">
            View Secret
            </button>
            <button onClick={() => setView('manage')} className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-lg hover:bg-gray-200 transition font-medium border border-gray-200">
            Delete Secret
            </button>
        </div>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
      <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Create New Secret</h2>
      <form onSubmit={handleCreate} className="space-y-5">
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            type="button" 
            onClick={() => setCreateType('text')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${createType === 'text' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            Text
          </button>
          <button 
            type="button" 
            onClick={() => setCreateType('file')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${createType === 'file' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            File (Cloud Upload)
          </button>
        </div>

        <div>
          {createType === 'text' ? (
            <textarea 
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
              placeholder="Enter your sensitive text..."
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              required
            />
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition">
              <input 
                type="file" 
                onChange={(e) => setSecretFile(e.target.files ? e.target.files[0] : null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              <p className="text-xs text-gray-400 mt-2">File will be uploaded to Supabase Storage.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Views</label>
            <input 
                type="number" 
                min="1" 
                max="100"
                className="w-full p-2 border border-gray-300 rounded"
                value={maxViews}
                onChange={(e) => setMaxViews(parseInt(e.target.value))}
            />
           </div>
           <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expires In (Mins)</label>
            <input 
                type="number" 
                min="1" 
                className="w-full p-2 border border-gray-300 rounded"
                value={expiration}
                onChange={(e) => setExpiration(parseInt(e.target.value))}
            />
           </div>
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password Protection (Optional)</label>
            <input 
                type="password"
                placeholder="Leave empty for no password"
                className="w-full p-2 border border-gray-300 rounded"
                value={secretPass}
                onChange={(e) => setSecretPass(e.target.value)}
            />
        </div>

        {errorMsg && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{errorMsg}</p>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setView('home')} className="flex-1 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
            {loading ? 'Processing...' : 'Create Secret Link'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderResult = () => (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <h2 className="text-xl font-bold text-gray-800">Secret Ready</h2>
      <p className="text-gray-500 text-sm mb-6">This link will expire in {expiration} minutes or after {maxViews} views.</p>

      <div className="bg-gray-50 p-4 rounded border border-gray-200 text-left space-y-3">
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Secret ID (Share this)</p>
            <div className="flex items-center gap-2">
                <code className="bg-white border p-2 rounded block w-full font-mono text-lg">{createdData?.id}</code>
            </div>
        </div>
        <div>
            <p className="text-xs font-bold text-red-400 uppercase">Delete Token (Keep this safe)</p>
            <code className="bg-white border p-2 rounded block w-full font-mono text-sm text-gray-600">{createdData?.deleteToken}</code>
        </div>
      </div>

      <button onClick={() => { setView('home'); setSecretText(''); setSecretFile(null); }} className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Done</button>
    </div>
  );

  const renderAccess = () => (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
      {!retrievedData ? (
        <>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Access Secret</h2>
            <form onSubmit={handleRetrieve} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Secret ID</label>
                    <input type="text" required value={accessId} onChange={(e) => setAccessId(e.target.value)} className="mt-1 w-full p-2 border rounded font-mono" placeholder="Paste ID here" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" value={accessPass} onChange={(e) => setAccessPass(e.target.value)} className="mt-1 w-full p-2 border rounded" placeholder="Required if protected" />
                </div>
                {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setView('home')} className="flex-1 py-2 text-gray-600 bg-gray-100 rounded">Back</button>
                    <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {loading ? 'Decrypting...' : 'View Content'}
                    </button>
                </div>
            </form>
        </>
      ) : (
        <div className="text-center">
            <h2 className="text-xl font-bold mb-2 text-gray-800">Secret Content</h2>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-xs inline-block mb-4">
                {retrievedData.isLastView ? "This was the last view. Secret deleted." : `${retrievedData.viewsLeft} views remaining.`}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6 max-h-96 overflow-y-auto text-left">
                {retrievedData.type === 'text' ? (
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{retrievedData.text}</pre>
                ) : (
                    <div className="text-center py-4">
                        <p className="font-semibold text-gray-700 mb-2">File: {retrievedData.file.name}</p>
                        <a 
                            href={retrievedData.file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Download from Cloud
                        </a>
                        <p className="text-xs text-gray-400 mt-2">Link expires shortly or when views run out.</p>
                    </div>
                )}
            </div>

            <button onClick={() => { setRetrievedData(null); setView('home'); setAccessId(''); setAccessPass(''); }} className="text-blue-600 hover:underline">
                Close and Return Home
            </button>
        </div>
      )}
    </div>
  );

  const renderManage = () => (
    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-red-600">Delete Secret</h2>
        {!successMsg ? (
            <form onSubmit={handleDelete} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Secret ID</label>
                    <input type="text" required value={deleteId} onChange={(e) => setDeleteId(e.target.value)} className="mt-1 w-full p-2 border rounded font-mono" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Delete Token</label>
                    <input type="text" required value={deleteToken} onChange={(e) => setDeleteToken(e.target.value)} className="mt-1 w-full p-2 border rounded font-mono" />
                </div>
                {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setView('home')} className="flex-1 py-2 text-gray-600 bg-gray-100 rounded">Back</button>
                    <button type="submit" disabled={loading} className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                        {loading ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                </div>
            </form>
        ) : (
            <div className="text-center">
                <div className="text-green-600 font-bold mb-4">{successMsg}</div>
                <button onClick={() => { setSuccessMsg(''); setView('home'); }} className="bg-gray-100 px-4 py-2 rounded text-gray-800">Return Home</button>
            </div>
        )}
    </div>
  );

  return (
    <>
      {view === 'home' && renderHome()}
      {view === 'create' && renderCreate()}
      {view === 'result' && renderResult()}
      {view === 'access' && renderAccess()}
      {view === 'manage' && renderManage()}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
