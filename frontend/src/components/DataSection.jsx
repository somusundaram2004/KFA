export default function DataSection({ title, rows, columns, compact = false }) {
  return (
    <section className={compact ? 'panel' : 'table-section'}>
      <h3>{title}</h3>
      {!rows.length ? (
        <p className="empty">No records yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => <td key={column}>{String(row[column] ?? '-')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
