/**
 * Examples demonstrating pool delayed disposal (grace period)
 */

import { pool, blox, signal, rx } from "rxblox";
import { useNavigate, useParams } from "react-router-dom";

// ============================================================================
// Example 1: Route Data with Grace Period for Back Navigation
// ============================================================================

// Page data pool with 10 second grace period
const createPageData = pool((pageId: string) => {
  console.log(`📦 Loading page data for: ${pageId}`);
  
  const data = signal<any>(null);
  const loading = signal(true);
  
  // Simulate data fetch
  fetch(`/api/pages/${pageId}`)
    .then(r => r.json())
    .then(result => {
      data.set(result);
      loading.set(false);
    });
  
  return { data, loading };
}, { dispose: 10000 }); // 10 second grace period

const PageView = blox(() => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  
  // If user navigates back within 10s, data is instant!
  const pageData = createPageData(pageId!);
  
  return (
    <div>
      {rx(() => (
        pageData.loading() ? (
          <div>Loading...</div>
        ) : (
          <>
            <h1>{pageData.data()?.title}</h1>
            <p>{pageData.data()?.content}</p>
            <button onClick={() => navigate(-1)}>Back</button>
          </>
        )
      ))}
    </div>
  );
});

// User flow:
// 1. View /page/1 → loads data (10s grace period starts on unmount)
// 2. Navigate to /page/2 → loads data
// 3. Go back to /page/1 within 10s → instant! (reuses cached data)
// 4. Go back to /page/1 after 10s → fetches again (cache expired)

// ============================================================================
// Example 2: WebSocket Connections with Reconnect Grace Period
// ============================================================================

const createWsConnection = pool((url: string) => {
  console.log(`🔌 Opening WebSocket: ${url}`);
  
  const ws = new WebSocket(url);
  const messages = signal<string[]>([]);
  const status = signal<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  ws.onopen = () => {
    console.log('✅ WebSocket connected');
    status.set('connected');
  };
  
  ws.onmessage = (e) => {
    messages.set(prev => [...prev, e.data]);
  };
  
  ws.onclose = () => {
    console.log('🔴 WebSocket closed');
    status.set('disconnected');
  };
  
  // Cleanup when disposed
  return {
    ws,
    messages,
    status,
    send: (data: string) => ws.send(data),
    close: () => ws.close()
  };
}, { dispose: 30000 }); // 30 second grace period

const ChatComponent = blox(() => {
  const connection = createWsConnection('wss://chat.example.com');
  
  const sendMessage = () => {
    connection.send('Hello from user!');
  };
  
  return (
    <div>
      <div>Status: {rx(() => connection.status())}</div>
      <div>
        Messages:
        {rx(() => (
          <ul>
            {connection.messages().map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        ))}
      </div>
      <button onClick={sendMessage}>Send</button>
    </div>
  );
});

// User flow:
// 1. Open chat tab → WebSocket connects
// 2. Switch to another tab → Component unmounts, but connection stays alive for 30s
// 3. Come back within 30s → Reuses same connection! No reconnect needed
// 4. Come back after 30s → Connection closed, reconnects on mount

// ============================================================================
// Example 3: Heavy Computation with Rapid Filter Changes
// ============================================================================

interface FilterOptions {
  category: string;
  priceRange: [number, number];
  sortBy: string;
}

const createFilteredResults = pool((filter: FilterOptions) => {
  console.log(`🔍 Computing results for filter:`, filter);
  
  // Expensive computation
  const results = signal(performExpensiveFiltering(filter));
  
  return { results };
}, { 
  dispose: 2000, // 2 second grace period
  equals: (a, b) => 
    a.category === b.category &&
    a.priceRange[0] === b.priceRange[0] &&
    a.priceRange[1] === b.priceRange[1] &&
    a.sortBy === b.sortBy
});

function performExpensiveFiltering(filter: FilterOptions) {
  // Simulate expensive work
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    category: ['A', 'B', 'C'][i % 3],
    price: Math.random() * 1000
  }));
  
  return items
    .filter(item => item.category === filter.category)
    .filter(item => 
      item.price >= filter.priceRange[0] && 
      item.price <= filter.priceRange[1]
    )
    .sort((a, b) => 
      filter.sortBy === 'price' 
        ? a.price - b.price 
        : a.id - b.id
    );
}

const ProductList = blox(() => {
  const [filter, setFilter] = React.useState<FilterOptions>({
    category: 'A',
    priceRange: [0, 1000],
    sortBy: 'price'
  });
  
  // If user toggles filter back quickly, reuses cached computation!
  const filtered = createFilteredResults(filter);
  
  return (
    <div>
      <select 
        value={filter.category}
        onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
      >
        <option value="A">Category A</option>
        <option value="B">Category B</option>
        <option value="C">Category C</option>
      </select>
      
      <div>
        {rx(() => (
          <div>Results: {filtered.results().length} items</div>
        ))}
      </div>
    </div>
  );
});

// User flow:
// 1. Select "Category A" → computes (2s grace period)
// 2. Select "Category B" → computes (Category A still in cache)
// 3. Select "Category A" again within 2s → instant! (reuses cache)
// 4. Wait 3 seconds
// 5. Select "Category A" again → recomputes (cache expired)

// ============================================================================
// Example 4: Image Processing with Recent History
// ============================================================================

const createImageProcessor = pool((imageUrl: string) => {
  console.log(`🖼️  Processing image: ${imageUrl}`);
  
  const processed = signal<string | null>(null);
  const thumbnail = signal<string | null>(null);
  
  // Simulate processing
  processImage(imageUrl).then(result => {
    processed.set(result.processed);
    thumbnail.set(result.thumbnail);
  });
  
  return { processed, thumbnail };
}, { dispose: 15000 }); // 15 second grace period

async function processImage(url: string) {
  // Simulate heavy image processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    processed: `${url}?processed=true`,
    thumbnail: `${url}?thumb=true`
  };
}

const ImageGallery = blox(() => {
  const [currentImage, setCurrentImage] = React.useState('image1.jpg');
  
  const processor = createImageProcessor(currentImage);
  
  return (
    <div>
      <div>
        <button onClick={() => setCurrentImage('image1.jpg')}>Image 1</button>
        <button onClick={() => setCurrentImage('image2.jpg')}>Image 2</button>
        <button onClick={() => setCurrentImage('image3.jpg')}>Image 3</button>
      </div>
      
      {rx(() => (
        processor.processed() ? (
          <img src={processor.processed()!} alt="Processed" />
        ) : (
          <div>Processing...</div>
        )
      ))}
    </div>
  );
});

// User flow:
// 1. View image1 → processes image (15s grace period)
// 2. View image2 → processes image
// 3. View image1 again within 15s → instant! (already processed)
// 4. Rapidly switch between image1, image2, image3 → smooth UX

// ============================================================================
// Key Benefits of Delayed Disposal
// ============================================================================

/*
✅ Better UX:
   - No loading spinners when user navigates back quickly
   - Smooth transitions for rapid interactions
   - Feels more responsive

✅ Performance:
   - Reduces redundant API calls
   - Avoids re-computing expensive operations
   - Minimizes WebSocket reconnections

✅ Resource Management:
   - Eventually cleans up unused instances
   - Configurable grace period per use case
   - Balance between memory and UX

⏱️ Choosing the Right Delay:

- Route/Page Data: 5-15 seconds
  (Users often use back button quickly)

- WebSocket Connections: 30-60 seconds
  (Tab switches, brief interruptions)

- Heavy Computations: 1-5 seconds
  (Rapid filter/sort changes)

- Image Processing: 10-30 seconds
  (Gallery browsing patterns)

- Search Results: 3-10 seconds
  (Users refine searches)

- Form Auto-save: 1-2 seconds
  (Typing pauses)
*/

