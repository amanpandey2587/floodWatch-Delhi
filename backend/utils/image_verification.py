"""
AI-powered image verification for waterlogging detection using OpenAI Vision API
"""
import os
import base64
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv
import json

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Master prompt for waterlogging detection
WATERLOGGING_VERIFICATION_PROMPT = """You are an expert civic infrastructure analyst specializing in urban waterlogging and drainage issues. 

Analyze this image carefully and determine if it shows evidence of waterlogging, flooding, or drainage problems in an urban/residential area.

WHAT TO LOOK FOR (Positive Indicators):
- Standing water on roads, streets, or pavements
- Flooded areas in residential or commercial zones
- Water accumulation in low-lying areas
- Submerged vehicles, bikes, or infrastructure
- Water entering buildings or homes
- Overflowing drains or sewers
- People wading through water
- Visible water damage to infrastructure
- Clogged or blocked drainage systems
- Puddles that indicate poor drainage

WHAT TO REJECT (False Positives):
- Natural water bodies (lakes, rivers, ponds, swimming pools)
- Beach or coastal scenes
- Rain without visible accumulation/flooding
- Water in containers (buckets, tanks)
- Irrigation or agricultural water use
- Car washes or cleaning activities
- Indoor water scenes (bathrooms, kitchens)
- Water sports or recreational water
- Images that don't show any outdoor urban environment

SEVERITY LEVELS:
- CRITICAL: Deep flooding (>1 foot), vehicles submerged, immediate danger
- HIGH: Significant waterlogging, difficult to pass, property at risk
- MODERATE: Noticeable water accumulation, some disruption
- LOW: Minor puddles, minimal impact
- NONE: No waterlogging detected

Respond in JSON format:
{
  "is_waterlogging": boolean,
  "confidence": number (0-100),
  "severity": "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "NONE",
  "detected_issues": [list of specific issues seen],
  "reasoning": "brief explanation of decision",
  "false_positive_reason": "if rejected, why it's not waterlogging" | null
}

Be strict but fair. Urban waterlogging is a serious issue - verify carefully."""

class ImageVerificationResult:
    def __init__(
        self,
        is_waterlogging: bool,
        confidence: float,
        severity: str,
        detected_issues: List[str],
        reasoning: str,
        false_positive_reason: Optional[str] = None
    ):
        self.is_waterlogging = is_waterlogging
        self.confidence = confidence
        self.severity = severity
        self.detected_issues = detected_issues
        self.reasoning = reasoning
        self.false_positive_reason = false_positive_reason
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_waterlogging": self.is_waterlogging,
            "confidence": self.confidence,
            "severity": self.severity,
            "detected_issues": self.detected_issues,
            "reasoning": self.reasoning,
            "false_positive_reason": self.false_positive_reason,
            "passed": self.is_waterlogging and self.confidence >= 50  # Threshold for acceptance
        }

def verify_image(image_base64: str) -> ImageVerificationResult:
    """
    Verify a single image using OpenAI Vision API
    
    Args:
        image_base64: Base64 encoded image string (with or without data URI prefix)
    
    Returns:
        ImageVerificationResult object with verification details
    """
    try:
        # Ensure proper data URI format
        if not image_base64.startswith('data:image'):
            # Detect image type from base64 header or default to jpeg
            image_base64 = f"data:image/jpeg;base64,{image_base64}"
        
        print(f"[ImageVerification] Verifying image (size: {len(image_base64)} chars)")
        
        # Call OpenAI Vision API
        response = client.chat.completions.create(
            model="gpt-4o",  # GPT-4 Vision model
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at analyzing images for urban waterlogging and drainage issues."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": WATERLOGGING_VERIFICATION_PROMPT
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_base64,
                                "detail": "high"  # High detail for better analysis
                            }
                        }
                    ]
                }
            ],
            max_tokens=500,
            temperature=0.3  # Lower temperature for more consistent results
        )
        
        # Parse response
        result_text = response.choices[0].message.content.strip()
        print(f"[ImageVerification] OpenAI response: {result_text}")
        
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        result_data = json.loads(result_text)
        
        # Create result object
        verification_result = ImageVerificationResult(
            is_waterlogging=result_data.get("is_waterlogging", False),
            confidence=float(result_data.get("confidence", 0)),
            severity=result_data.get("severity", "NONE"),
            detected_issues=result_data.get("detected_issues", []),
            reasoning=result_data.get("reasoning", ""),
            false_positive_reason=result_data.get("false_positive_reason")
        )
        
        print(f"[ImageVerification] Result: is_waterlogging={verification_result.is_waterlogging}, "
              f"confidence={verification_result.confidence}%, severity={verification_result.severity}")
        
        return verification_result
        
    except json.JSONDecodeError as e:
        print(f"[ImageVerification] ERROR: Failed to parse OpenAI response as JSON: {e}")
        print(f"[ImageVerification] Raw response: {result_text}")
        # Return a low-confidence negative result
        return ImageVerificationResult(
            is_waterlogging=False,
            confidence=0,
            severity="NONE",
            detected_issues=[],
            reasoning="Failed to analyze image - invalid response format",
            false_positive_reason="Technical error in analysis"
        )
    except Exception as e:
        print(f"[ImageVerification] ERROR: {type(e).__name__}: {str(e)}")
        # Return error result
        return ImageVerificationResult(
            is_waterlogging=False,
            confidence=0,
            severity="NONE",
            detected_issues=[],
            reasoning=f"Error during verification: {str(e)}",
            false_positive_reason="Technical error"
        )

def verify_images_batch(images_base64: List[str]) -> List[Dict[str, Any]]:
    """
    Verify multiple images
    
    Args:
        images_base64: List of base64 encoded images
    
    Returns:
        List of verification result dictionaries
    """
    results = []
    
    for i, image in enumerate(images_base64):
        print(f"[ImageVerification] Verifying image {i+1}/{len(images_base64)}")
        result = verify_image(image)
        results.append({
            "index": i,
            **result.to_dict()
        })
    
    return results

def get_verification_summary(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate summary statistics from verification results
    
    Args:
        results: List of verification result dictionaries
    
    Returns:
        Summary dictionary with statistics
    """
    total = len(results)
    if total == 0:
        return {
            "total_images": 0,
            "verified_count": 0,
            "rejected_count": 0,
            "verification_rate": 0,
            "average_confidence": 0,
            "has_critical": False,
            "has_high": False,
            "recommendation": "NO_IMAGES"
        }
    
    verified = sum(1 for r in results if r["passed"])
    rejected = total - verified
    avg_confidence = sum(r["confidence"] for r in results) / total
    
    has_critical = any(r["severity"] == "CRITICAL" for r in results if r["passed"])
    has_high = any(r["severity"] == "HIGH" for r in results if r["passed"])
    
    # Recommendation logic
    if verified == 0:
        recommendation = "REJECT_ALL"
    elif verified == total:
        recommendation = "ACCEPT_ALL"
    else:
        recommendation = "PARTIAL_ACCEPT"
    
    return {
        "total_images": total,
        "verified_count": verified,
        "rejected_count": rejected,
        "verification_rate": round((verified / total) * 100, 1),
        "average_confidence": round(avg_confidence, 1),
        "has_critical": has_critical,
        "has_high": has_high,
        "recommendation": recommendation
    }