// Prints every form value Apple PDFKit (the engine behind Preview and Safari) sees in a PDF, as JSON.
// Used by tests/browser-e2e.cjs on macOS. PDFKit reads values from the parent field, so this catches
// fields that other viewers show but Preview would show blank.
//
//   swiftc -O tests/pdfkit-check.swift -o /tmp/pdfkit-check && /tmp/pdfkit-check filled.pdf
import Foundation
import PDFKit

guard CommandLine.arguments.count == 2, let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1])) else {
  FileHandle.standardError.write("usage: pdfkit-check file.pdf\n".data(using: .utf8)!)
  exit(2)
}
var text: [String: [String]] = [:]
var radio: [String: String] = [:]
for index in 0..<doc.pageCount {
  guard let page = doc.page(at: index) else { continue }
  for annotation in page.annotations {
    guard let name = annotation.fieldName else { continue }
    if annotation.widgetFieldType == .text {
      text[name, default: []].append(annotation.widgetStringValue ?? "")
    } else if annotation.widgetFieldType == .button, annotation.buttonWidgetState == .onState {
      radio[name] = annotation.buttonWidgetStateString
    }
  }
}
let result: [String: Any] = ["locked": doc.isLocked, "pages": doc.pageCount, "text": text, "radio": radio]
let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)
