#!/usr/bin/swift
import Foundation
import Vision
import CoreML

// OCR Processing Script using Apple Vision Framework
struct OCRProcessor {
    static func processImage(
        imagePath: String,
        recognitionLevel: String,
        languages: [String],
        customWords: [String],
        minimumTextHeight: Float,
        requestId: String
    ) -> [String: Any] {
        
        guard let imageData = NSData(contentsOfFile: imagePath),
              let cgImage = createCGImage(from: imageData) else {
            return ["error": "Failed to load image"]
        }
        
        var result: [String: Any] = [
            "request_id": requestId,
            "text": "",
            "confidence": 0.0,
            "bounding_boxes": [],
            "ane_used": false,
            "processing_time_ms": 0.0
        ]
        
        let startTime = CFAbsoluteTimeGetCurrent()
        let semaphore = DispatchSemaphore(value: 0)
        
        let request = VNRecognizeTextRequest { request, error in
            defer { semaphore.signal() }
            
            if let error = error {
                result["error"] = error.localizedDescription
                return
            }
            
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                result["error"] = "No text observations found"
                return
            }
            
            var allText: [String] = []
            var boundingBoxes: [[String: Any]] = []
            var totalConfidence: Float = 0.0
            var observationCount = 0
            
            for observation in observations {
                guard let topCandidate = observation.topCandidates(1).first else { continue }
                
                allText.append(topCandidate.string)
                totalConfidence += topCandidate.confidence
                observationCount += 1
                
                // Add bounding box information
                let boundingBox = observation.boundingBox
                boundingBoxes.append([
                    "text": topCandidate.string,
                    "x": boundingBox.origin.x,
                    "y": boundingBox.origin.y,
                    "width": boundingBox.size.width,
                    "height": boundingBox.size.height,
                    "confidence": topCandidate.confidence
                ])
            }
            
            result["text"] = allText.joined(separator: "\n")
            result["confidence"] = observationCount > 0 ? totalConfidence / Float(observationCount) : 0.0
            result["bounding_boxes"] = boundingBoxes
            result["ane_used"] = !request.usesCPUOnly
        }
        
        // Configure request
        request.recognitionLevel = recognitionLevel == "fast" ? .fast : .accurate
        request.usesCPUOnly = false  // Enable ANE acceleration
        request.minimumTextHeight = minimumTextHeight
        request.recognitionLanguages = languages
        request.customWords = customWords
        
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
    
    guard args.count >= 7 else {
        print("Usage: swift ocr_processor.swift <image_path> <recognition_level> <languages> <custom_words> <min_text_height> <request_id>")
        exit(1)
    }
    
    let imagePath = args[1]
    let recognitionLevel = args[2]
    let languages = args[3].components(separatedBy: ",")
    let customWords = args[4].components(separatedBy: ",").filter { !$0.isEmpty }
    let minimumTextHeight = Float(args[5]) ?? 0.03125
    let requestId = args[6]
    
    let result = OCRProcessor.processImage(
        imagePath: imagePath,
        recognitionLevel: recognitionLevel,
        languages: languages,
        customWords: customWords,
        minimumTextHeight: minimumTextHeight,
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
