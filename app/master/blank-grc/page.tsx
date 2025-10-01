"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function BlankGrcFormPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Print styles
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      
      .print-form-area, .print-form-area * {
        visibility: visible;
      }
      
      .print-form-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      
      button, .no-print {
        display: none !important;
      }
      
      .print-form-area {
        background: white;
        box-shadow: none;
        border: none;
        padding: 0;
        margin: 0;
      }
      
      .print-form-area {
        page-break-inside: avoid;
      }
    }
  `;

  // Function to generate and download PDF
  const handleDownloadPDF = async () => {
    if (!formRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      pdf.save("Guest_Registration_Card.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle></CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => window.print()}
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Form
            </Button>
            <Button 
              onClick={handleDownloadPDF}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <div className="flex items-center">
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Generating...
                </div>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>          <div 
            ref={formRef} 
            className="bg-white p-6 rounded-md border border-gray-200 max-w-4xl mx-auto print-form-area"
          >
            {/* GRC Form Content */}
            <div className="print:block">
              {/* Hotel Header */}
              <div className="text-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold uppercase tracking-wide">HOTEL NAME</h1>
                <p className="text-sm text-gray-600">123 Hotel Street, City, State, PIN - 123456</p>
                <p className="text-sm text-gray-600">Tel: +91 1234567890 | Email: info@hotelname.com</p>
                <h2 className="text-xl font-bold mt-2">GUEST REGISTRATION CARD</h2>
              </div>

              {/* Guest Information Section */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-3">
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Full Name</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Address</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">City</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Mobile Number</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">State</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Pin Code</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Nationality</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                </div>
              </div>

              {/* ID Proof Section */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">ID PROOF DETAILS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">ID Type (Passport/Aadhar/Driving License)</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">ID Number</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                </div>
              </div>

              {/* Reservation Details */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">RESERVATION DETAILS</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Check-in Date</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Check-out Date</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">No. of Nights</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                </div>
              </div>

              {/* Room Details */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">ROOM DETAILS</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Room Number</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Room Type</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Room Rate</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                </div>
              </div>
              
              {/* Additional Guests */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">ADDITIONAL GUESTS</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="border border-gray-300 p-1 text-left">Name</th>
                      <th className="border border-gray-300 p-1 text-left">Age</th>
                      <th className="border border-gray-300 p-1 text-left">ID Type</th>
                      <th className="border border-gray-300 p-1 text-left">ID Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(3)].map((_, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 p-1 h-6"></td>
                        <td className="border border-gray-300 p-1 h-6"></td>
                        <td className="border border-gray-300 p-1 h-6"></td>
                        <td className="border border-gray-300 p-1 h-6"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Information */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">PAYMENT INFORMATION</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Payment Method</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                  <div className="border-b pb-1">
                    <div className="text-xs text-gray-500">Advance Payment</div>
                    <div className="h-6 border-b border-dotted border-gray-300"></div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-1">TERMS & CONDITIONS</h3>
                <ol className="text-xs text-gray-700 list-decimal pl-5 space-y-1">
                  <li>Check-in time is 12:00 PM and check-out time is 10:00 AM.</li>
                  <li>All bills must be settled upon presentation.</li>
                  <li>The management is not responsible for any valuables not deposited in the hotel safe.</li>
                  <li>Guests are liable for any damage to hotel property caused by them.</li>
                  <li>Visitors are allowed in guest rooms only with prior permission from the reception.</li>
                  <li>Outside food and beverages are not permitted in the hotel premises.</li>
                </ol>
              </div>

              {/* Signature Section */}
              <div className="grid grid-cols-2 gap-8 mt-6">
                <div>
                  <div className="border-t border-gray-400 pt-1 w-48">
                    <div className="text-xs text-gray-500">Guest Signature</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-t border-gray-400 pt-1 w-48 ml-auto">
                    <div className="text-xs text-gray-500">Front Office Signature</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-xs text-gray-500">
                <p>Thank you for choosing Hotel Name. We wish you a pleasant stay!</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}


