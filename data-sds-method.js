/* Database-only mechanics for reviewed source e8H8d0irqLg. */
(function(){
  const Q=(q,choices,answer,why)=>({q,choices,answer,explain:why[answer],choiceExplanations:why});
  const guide='<a href="practical-labs/design-method/README.md" target="_blank" rel="noopener noreferrer">Search and seat-hold practice guide</a>';
  SG.extendLevel('sds-db-query-cost',{
    objectives:['Full-text AND aur ordered token phrase ko actual FTS5 query se compare karo.'],
    lesson:[
      '<h3>Database text search ko always full scan mat samjho</h3><p>Book ke end ka word index imagine karo: word → pages. Full-text index word → matching row IDs maintain karta hai. System architecture ko separate search service chahiye ya database full-text search enough hai, workload aur required search features decide karte hain.</p><p><a href="https://www.sqlite.org/fts5.html" target="_blank" rel="noopener noreferrer">SQLite FTS5</a> companion default tokenizer and full positional detail use karti hai. <code>system AND design</code> dono tokens ki presence maangta hai. <code>"system design"</code> same order mein consecutive tokens maangta hai. Exact token phrase raw bytes, casing or punctuation equality nahi. Tokenization settings matter karti hain.</p><pre>SELECT rowid FROM posts\nWHERE posts MATCH ? ORDER BY rowid;</pre><p>Parameter binding SQL string interpolation avoid karti hai. MATCH parameter phir bhi FTS query grammar follow karta hai; arbitrary user text ko app ke chosen search syntax ke according handle karo.</p>',
      '<h3>Stored content aur index ek transaction mein</h3><p>Lab ordinary FTS5 virtual table use karti hai, external-content table nahi. Insert/update/delete us table ka content aur index maintain karte hain. Injected exception par transaction rollback query result restore karta hai. External search service ke async projection ko same local SQL transaction automatically cover nahi karti.</p><pre>python3 practical-labs/design-method/search.py</pre><p>SQL Gurukul folder se run karo. '+guide+'. Architecture freshness, versioned deletion and access checks <a href="../sys-design-gurukul/index.html#level=search">System Gurukul Search</a> mein hain.</p>'
    ],stages:[
      {type:'flow',title:'Dono words hain; phrase kyun nahi?',scenario:'Row1: system design interview. Row2: design of system. Same FTS5 tokenizer for both.',lanes:[{id:'query',label:'Query'},{id:'index',label:'FTS5 index'},{id:'result',label:'Result'}],steps:[
        {lane:'query',t:'MATCH system AND design',note:'Need both tokens anywhere in each document.'},
        {lane:'index',t:'Both row1 and row2 match',note:'Word presence does not require source order.'},
        {lane:'query',t:'Now MATCH the quoted phrase system design',note:'Positions matter now.',ask:Q('Which row matches the token phrase?', ['Both; same two words','Only row2; word order ignored','Only row1; system immediately precedes design'],2,['AND and phrase have different contracts.','Row2 reverses order and adds of.','Row1 has the consecutive token sequence.'])},
        {lane:'result',t:'Return row1',good:true,note:'Ranking and authorization are separate from this matching rule.'}
      ],insight:'Choose word, phrase or proximity matching explicitly; otherwise search behavior feels random.'},
      {type:'quiz',title:'FTS update aur rollback',questions:[
        Q('Ordinary FTS5 table row2 changes from design of system to runtime engineering and commits. Old AND query?', ['Still returns row2 forever','Stops returning row2 for those old tokens','Drops every row'],1,['The table maintains its full-text index on update.','Old terms are replaced in this table’s index.','Only the targeted row changes.']),
        Q('DELETE row1 inside a transaction, then rollback. Query after rollback?', ['Row1 matches again','Row1 permanently gone','All documents duplicated'],0,['Rollback undoes the uncommitted deletion.','The deletion did not commit.','Rollback restores previous state; it does not insert duplicate rows.']),
        Q('Does this SQLite transaction update an external Elasticsearch cluster atomically?', ['Yes; both are indexes','Yes; MATCH sends network messages','No; an external projection needs its own handoff and recovery'],2,['Shared purpose does not create shared atomicity.','This FTS5 query is local SQLite work.','Local transaction proof is limited to this database.'])
      ]}
    ]
  });
  SG.extendLevel('locks',{
    objectives:['Seat finalization mein owner, generation, deadline and unsold guard combine karo.'],
    lesson:[
      '<h3>Available seat ka current hold owner kaun hai?</h3><p>Alice generation7 expires600. Bob generation8 takes the new hold at601. At700 Alice’s old payment response arrives. <code>sold_owner IS NULL</code> alone would let Alice take a currently unsold seat despite Bob’s hold. Match concert, seat, owner, generation and authoritative deadline.</p><pre>UPDATE seats SET sold_owner=?, sold_generation=?, sale_operation=?\nWHERE concert=? AND seat=? AND sold_owner IS NULL\n  AND owner=? AND generation=? AND expires > ?;</pre><p>Exercise expiry rule strict hai: now=expires means expired. Zero affected rows means no claim under these conditions; inspect state to explain expired, wrong owner, stale generation, missing or sold. A retry of an already committed operation can return its stored result even after hold expiry.</p>',
      '<h3>Sale aur payment-intent ki local boundary</h3><p>Conditional sale update plus capture-intent insert one transaction mein commit karo. Duplicate committed operation returns the stored sale and creates no new intent. Injected failure rolls both changes back. SQL transaction remote payment capture ko include nahi karti. Actual provider ke idempotency and reconciliation rules required hain.</p><pre>python3 practical-labs/design-method/holds.py</pre><p>'+guide+'. Temporary real SQLite database; time is an explicit fixture. No payment service runs. Waiting room, cache and business compensation decisions <a href="../sys-design-gurukul/index.html#level=ticketmaster">System Gurukul Ticketmaster</a> mein hain.</p>'
    ],stages:[
      {type:'flow',title:'Expired owner ka late payment',scenario:'C7/A12 currently Bob generation8 until1200. Alice callback carries generation7 at700.',lanes:[{id:'callback',label:'Payment callback'},{id:'db',label:'SQLite'},{id:'decision',label:'Result'}],steps:[
        {lane:'callback',t:'Alice requests finalization with generation7',note:'An old payment response does not extend the old hold.'},
        {lane:'db',t:'Compare owner + generation + deadline + unsold',note:'Bob generation8 is the current owner. Alice does not match.'},
        {lane:'decision',t:'Affected rows = 0',note:'No seat sale or capture intent was committed.',ask:Q('Correct handling?', ['Sell to Alice because the seat is unsold','Overwrite Bob’s generation with7','Reject stale finalization; reconcile Alice’s payment separately'],2,['Unsold is only one predicate.','Old callbacks cannot redefine current ownership.','Payment compensation depends on whether money was authorized or captured.'])},
        {lane:'db',t:'Bob can finalize his valid current hold',good:true,note:'Successful update and payment intent commit together; provider execution remains separate.'}
      ],insight:'The final write must verify current authority, not just absence of a previous sale.'},
      {type:'quiz',title:'Hold boundary aur retry result',questions:[
        Q('Policy expires>now; expires1200 and now1200. Claim?', ['Accept at equality','Reject at equality','Ignore deadline'],1,['Equality does not satisfy greater-than.','The declared boundary is explicit.','The hold has a finite validity window.']),
        Q('Sale and intent inserted; exception before COMMIT rolls transaction back. Durable state?', ['Neither new change survives','Sale survives without intent','Provider definitely captured payment'],0,['Both changes were inside the rolled-back transaction.','That partial state is prevented locally.','No remote provider ran in this SQL lab.']),
        Q('Bob’s exact operation committed at700. Same operation retries at1300. What can API return?', ['New sale with another capture intent','Expired means undo the old sale','Stored committed result, with no new local intent'],2,['A retry is not another purchase.','Expiry blocks new claims; it does not reverse a committed sale.','Stored operation identity distinguishes replay from a new attempt.'])
      ]}
    ]
  });
})();
