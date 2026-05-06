export default function DataSection({ title, rows, columns, compact = false }) {
  if (!rows.length) return null

  const visibleColumns = rows.length
    ? columns.filter((column) => rows.some((row) => row[column] !== undefined && row[column] !== null && row[column] !== ''))
    : columns

  return (
    <section className={compact ? 'panel' : 'table-section'}>
      <h3>{title}</h3>
      {!rows.length ? (
        <p className="empty">No records yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{visibleColumns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {visibleColumns.map((column) => <td key={column}>{String(row[column] ?? '-')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
