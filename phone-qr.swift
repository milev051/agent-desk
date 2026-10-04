import Foundation
import CoreImage
import AppKit
let input = FileHandle.standardInput.readDataToEndOfFile()
let filter = CIFilter(name: "CIQRCodeGenerator")!
filter.setValue(input, forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")
let image = filter.outputImage!
let padded = image.extent.insetBy(dx: -4, dy: -4)
let background = CIImage(color: CIColor.white).cropped(to: padded)
let output = image.composited(over: background).transformed(by: CGAffineTransform(scaleX: 6, y: 6))
let context = CIContext()
let bitmap = NSBitmapImageRep(cgImage: context.createCGImage(output, from: output.extent)!)
FileHandle.standardOutput.write(bitmap.representation(using: .png, properties: [:])!)
