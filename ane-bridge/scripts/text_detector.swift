#!/usr/bin/swift
import Foundation
import Vision
import CoreML

// Text Detection Script using Apple Vision Framework
struct TextDetector {
    static func detectText(
        imagePath: String,
        confidenceThreshold: Float,
        requestId: String
    ) -> [String: Any] {
        
        guard let imageData = NSData(contentsOfFile: imagePath),
              let cgImage = createCGImage(from: imageData) else {
            return ["error": "Failed to load image"]
        }
        
        var result: [String: Any] = [
            "request_id": requestId,
            "detected": false,
            "regions": [],
            "ane_used": false,
            "processing_time_ms": 0.0
        ]
        
        let startTime = CFAbsoluteTimeGetCurrent()
        let semaphore = DispatchSemaphore(value: 0)
        
        let request = VNDetectTextRectanglesRequest { request, error in
            defer { semaphore.signal() }
            
            if let error = error {
                result["error"] = error.localizedDescription
                return
            }
            
            guard let observations = request.results as? [VNTextObservation] else {
                return
            }
            
            var regions: [[String: Any]] = []
            
            for observation in observations {
                if observation.confidence >= confidenceThreshold {
                    let boundingBox = observation.boundingBox
                    regions.append([
                        "x": boundingBox.origin.x,
                        "y": boundingBox.origin.y,
                        "width": boundingBox.size.width,
                        "height": boundingBox.size.height,
                        "confidence": observation.confidence
                    ])
                }
            }
            
            result["detected"] = !regions.isEmpty
            result["regions"] = regions
            result["ane_used"] = true  // Text detection typically uses ANE
        }
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        do {
            try handler.perform([request])
            semaphore.wait()
        } catch {
            result["error"] = error.localizedDescription
        }
        
        let processingTime = (CFAbsoluteTimeGetCurrent() - startTime) * 1000
        result["processing_time_ms"] = processingTime
        
        return result
    }
    
    static func createCGImage(from data: NSData) -> CGImage? {
        guard let imageSource = CGImageSourceCreateWithData(data, nil),
              let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else {
            return nil
        }
        return cgImage
    }
}

// Main execution
func main() {
    let args = CommandLine.arguments
    
    guard args.count >= 4 else {
        print("Usage: swift text_detector.swift <image_path> <confidence_threshold> <request_id>")
        exit(1)
    }
    
    let imagePath = args[1]
    let confidenceThreshold = Float(args[2]) ?? 0.8
    let requestId = args[3]
    
    let result = TextDetector.detectText(
        imagePath: imagePath,
        confidenceThreshold: confidenceThreshold,
        requestId: requestId
    )
    
    if let jsonData = try? JSONSerialization.data(withJSONObject: result, options: []),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    } else {
        print("{\"error\": \"Failed to serialize result\"}")
    }
}

main()
